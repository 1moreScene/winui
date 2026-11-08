//! Public compositor contract: a retained page must never acquire host defaults
//! when a transition track ends, including when its instance ID is older.
use winui_wasm::{
    enums::{NavigationCacheMode as Cache, NavigationTransition as Transition},
    frame::{Command, Frame, Snapshot},
};
fn navigate(frame: &mut Frame, page: &str, transition: Transition, cache: Cache, time: f64) {
    frame
        .apply(
            Command::Navigate {
                page: page.into(),
                parameter: 0,
                transition,
                cache_mode: cache,
            },
            time,
        )
        .unwrap();
}
fn assert_total_frame(snapshot: &Snapshot) {
    assert_eq!(snapshot.pages.len(), snapshot.visuals.len());
    for page in &snapshot.pages {
        let states: Vec<_> = snapshot
            .visuals
            .iter()
            .filter(|v| v.instance == page.instance)
            .collect();
        assert_eq!(states.len(), 1);
        let state = states[0];
        assert!((0. ..=1.).contains(&state.opacity));
        if !state.visible {
            assert_eq!(state.opacity, 0.);
            assert!(!state.interactive);
            assert_eq!(state.z_index, 0);
        }
        if state.interactive {
            assert!(!snapshot.animating);
            assert_eq!(Some(state.instance), snapshot.current_instance);
        }
    }
    assert!(snapshot
        .visuals
        .windows(2)
        .all(|w| w[0].z_index <= w[1].z_index));
}
#[test]
fn cached_exit_stays_explicitly_hidden_at_150ms_450ms_and_later_ticks() {
    for cache in [Cache::Enabled, Cache::Required] {
        for transition in [
            Transition::Entrance,
            Transition::SlideFromLeft,
            Transition::SlideFromRight,
            Transition::Suppress,
        ] {
            let mut frame = Frame::default();
            navigate(&mut frame, "a", Transition::Suppress, cache, 0.);
            let old = frame.snapshot(0.).current_instance.unwrap();
            navigate(&mut frame, "b", transition, cache, 1000.);
            for dt in [
                0., 1., 149.999, 150., 150.001, 449.999, 450., 450.001, 500., 2000.,
            ] {
                frame.advance(1000. + dt);
                let snapshot = frame.snapshot(1000. + dt);
                assert_total_frame(&snapshot);
                let state = snapshot.visuals.iter().find(|v| v.instance == old).unwrap();
                if dt >= 150. || transition == Transition::Suppress {
                    assert!(!state.visible);
                    assert_eq!(state.opacity, 0.);
                }
                let current = snapshot
                    .visuals
                    .iter()
                    .find(|v| Some(v.instance) == snapshot.current_instance)
                    .unwrap();
                assert!(current.visible);
                if dt >= 450. || transition == Transition::Suppress {
                    assert!(current.interactive);
                    assert_eq!(current.opacity, 1.);
                }
            }
        }
    }
}
#[test]
fn returning_to_older_cached_instance_uses_core_paint_order_and_never_revives_other_pages() {
    let mut frame = Frame::default();
    navigate(&mut frame, "a", Transition::Suppress, Cache::Enabled, 0.);
    let a = frame.snapshot(0.).current_instance.unwrap();
    navigate(&mut frame, "b", Transition::Entrance, Cache::Enabled, 1000.);
    frame.advance(1500.);
    frame.apply(Command::Back, 2000.).unwrap();
    let snapshot = frame.snapshot(2000.);
    assert_eq!(snapshot.current_instance, Some(a));
    assert_total_frame(&snapshot);
    assert_eq!(
        snapshot
            .visuals
            .iter()
            .filter(|v| v.visible)
            .max_by_key(|v| v.z_index)
            .unwrap()
            .instance,
        a
    );
    frame.advance(2450.);
    let settled = frame.snapshot(2450.);
    assert_total_frame(&settled);
    assert_eq!(settled.visuals.iter().filter(|v| v.visible).count(), 1);
    let states = settled.visuals;
    for time in [2450.1, 2451., 2500., 5000.] {
        frame.advance(time);
        assert_eq!(frame.snapshot(time).visuals, states);
    }
}
#[test]
fn rapid_navigation_and_motion_policy_change_publish_one_complete_terminal_frame() {
    let mut frame = Frame::default();
    navigate(&mut frame, "a", Transition::Suppress, Cache::Enabled, 0.);
    navigate(&mut frame, "b", Transition::Entrance, Cache::Enabled, 1000.);
    navigate(&mut frame, "c", Transition::Entrance, Cache::Enabled, 1080.);
    for time in [1080., 1149.999, 1150., 1229.999, 1230., 1529.999, 1530.] {
        frame.advance(time);
        assert_total_frame(&frame.snapshot(time));
    }
    navigate(
        &mut frame,
        "a",
        Transition::SlideFromRight,
        Cache::Enabled,
        1600.,
    );
    frame
        .apply(
            Command::Configure {
                cache_size: 10,
                reduced_motion: true,
            },
            1601.,
        )
        .unwrap();
    let snapshot = frame.snapshot(1601.);
    assert_total_frame(&snapshot);
    assert!(!snapshot.animating);
    assert_eq!(snapshot.visuals.iter().filter(|v| v.visible).count(), 1);
    assert_eq!(snapshot.visuals.iter().filter(|v| v.interactive).count(), 1);
}
#[test]
fn transparent_incoming_page_stays_in_layout_and_disposed_exits_have_no_paint_layer() {
    let mut frame = Frame::default();
    navigate(&mut frame, "a", Transition::Suppress, Cache::Disabled, 0.);
    navigate(
        &mut frame,
        "b",
        Transition::Entrance,
        Cache::Disabled,
        1000.,
    );
    let incoming = frame.snapshot(1000.).visuals.last().copied().unwrap();
    assert!(incoming.visible);
    assert_eq!(incoming.opacity, 0.);
    assert!(!incoming.interactive);
    frame.advance(1150.);
    let snapshot = frame.snapshot(1150.);
    assert_total_frame(&snapshot);
    assert_eq!(snapshot.visuals.len(), 1);
    assert_eq!(
        Some(snapshot.visuals[0].instance),
        snapshot.current_instance
    );
}
