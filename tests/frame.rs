use winui_wasm::{
    enums::{NavigationCacheMode as C, NavigationMode as M, NavigationTransition as T},
    frame::{Command, Frame},
};
fn nav(f: &mut Frame, page: &str, mode: C, t: T, time: f64) {
    f.apply(
        Command::Navigate {
            page: page.into(),
            parameter: 1,
            transition: t,
            cache_mode: mode,
        },
        time,
    )
    .unwrap();
}
#[test]
fn journal_cache_and_required_budget_follow_native() {
    let mut f = Frame::default();
    f.apply(
        Command::Configure {
            cache_size: 1,
            reduced_motion: true,
        },
        0.,
    )
    .unwrap();
    nav(&mut f, "required", C::Required, T::Entrance, 0.);
    let required = f.snapshot(0.).current_instance;
    nav(&mut f, "a", C::Enabled, T::Entrance, 1.);
    let a = f.snapshot(1.).current_instance;
    nav(&mut f, "b", C::Enabled, T::Entrance, 2.);
    f.apply(Command::Back, 3.).unwrap();
    assert_ne!(f.snapshot(3.).current_instance, a);
    f.apply(Command::Back, 4.).unwrap();
    assert_eq!(f.snapshot(4.).current_instance, required);
    assert_eq!(f.snapshot(4.).mode, M::Back);
    assert_eq!(f.forward.len(), 2);
    f.apply(
        Command::Configure {
            cache_size: 0,
            reduced_motion: true,
        },
        5.,
    )
    .unwrap();
    nav(&mut f, "disabled", C::Disabled, T::Suppress, 6.);
    f.apply(Command::Back, 7.).unwrap();
    assert_eq!(f.snapshot(7.).current_instance, required);
    nav(&mut f, "new", C::Enabled, T::Suppress, 8.);
    assert!(f.forward.is_empty());
}
#[test]
fn entrance_has_source_keyframes_and_back_reverses_outgoing_recipe() {
    let mut f = Frame::default();
    nav(&mut f, "a", C::Disabled, T::Suppress, 0.);
    nav(&mut f, "b", C::Disabled, T::Entrance, 1.);
    let s = f.snapshot(1.);
    assert_eq!(s.visuals[1].y, 140.);
    assert_eq!(s.visuals[1].opacity, 0.);
    let s = f.snapshot(151.);
    assert_eq!(s.visuals[0].opacity, 0.);
    assert_eq!(s.visuals[1].opacity, 1.);
    f.advance(451.);
    assert!(!f.snapshot(451.).animating);
    assert_eq!(f.snapshot(451.).pages.len(), 1);
    f.apply(Command::Back, 452.).unwrap();
    let s = f.snapshot(527.);
    assert!(s.visuals[0].y > 0.);
    assert_eq!(s.visuals[1].y, 0.);
}
#[test]
fn interruption_samples_old_visual_and_reduced_motion_releases_exit() {
    let mut f = Frame::default();
    nav(&mut f, "a", C::Disabled, T::Suppress, 0.);
    nav(&mut f, "b", C::Disabled, T::SlideFromRight, 1.);
    let visual = f.snapshot(201.).visuals[1];
    nav(&mut f, "c", C::Disabled, T::SlideFromLeft, 201.);
    assert_eq!(f.snapshot(201.).visuals[0].instance, visual.instance);
    assert_eq!(f.snapshot(201.).visuals[0].x, 0.); // Native slide exit has a discrete zero keyframe.
    assert_eq!(f.snapshot(201.).pages.len(), 2);
    f.apply(
        Command::Configure {
            cache_size: 10,
            reduced_motion: true,
        },
        202.,
    )
    .unwrap();
    assert!(!f.snapshot(202.).animating);
    assert_eq!(f.snapshot(202.).pages.len(), 1);
}

#[test]
fn rapid_entrance_keeps_prior_exit_and_resets_new_exit_opacity_like_native() {
    let mut f = Frame::default();
    nav(&mut f, "a", C::Disabled, T::Suppress, 0.);
    let a = f.snapshot(0.).current_instance.unwrap();
    nav(&mut f, "b", C::Disabled, T::Entrance, 1000.);
    let b = f.snapshot(1000.).current_instance.unwrap();
    nav(&mut f, "c", C::Disabled, T::Entrance, 1080.);
    let snapshot = f.snapshot(1080.);
    assert_eq!(snapshot.pages.len(), 3);
    let old = snapshot.visuals.iter().find(|v| v.instance == a).unwrap();
    assert!(old.opacity > 0.);
    let leaving = snapshot.visuals.iter().find(|v| v.instance == b).unwrap();
    assert_eq!(leaving.y, 140.);
    assert_eq!(leaving.opacity, 1.);
    f.advance(1150.);
    assert!(!f.snapshot(1150.).pages.iter().any(|p| p.instance == a));
    f.advance(1230.);
    assert_eq!(f.snapshot(1230.).pages.len(), 1);
    assert!(f.snapshot(1230.).animating);
}
#[test]
fn same_page_reuses_by_type_and_keeps_distinct_journal_entries() {
    let mut f = Frame::default();
    nav(&mut f, "a", C::Enabled, T::Entrance, 0.);
    let s = f.snapshot(0.);
    nav(&mut f, "a", C::Enabled, T::Entrance, 1.);
    let next = f.snapshot(1.);
    assert_eq!(s.current_instance, next.current_instance);
    assert_ne!(s.current.unwrap().id, next.current.unwrap().id);
    assert!(!next.animating);
    f.apply(
        Command::CacheMode {
            page: "a".into(),
            mode: C::Disabled,
        },
        2.,
    )
    .unwrap();
    nav(&mut f, "b", C::Disabled, T::Suppress, 3.);
    f.apply(Command::Back, 4.).unwrap();
    assert_ne!(f.snapshot(4.).current_instance, s.current_instance);
}
#[test]
fn direct_history_traversal_does_not_instantiate_intermediate_pages() {
    let mut f = Frame::default();
    nav(&mut f, "a", C::Disabled, T::Suppress, 0.);
    let id = f.current.as_ref().unwrap().id;
    nav(&mut f, "b", C::Disabled, T::Suppress, 1.);
    nav(&mut f, "c", C::Disabled, T::Suppress, 2.);
    f.apply(Command::Traverse { entry: id }, 3.).unwrap();
    assert_eq!(f.current.as_ref().unwrap().page, "a");
    assert_eq!(f.forward.len(), 2);
    assert_eq!(f.snapshot(3.).pages.len(), 1);
    f.apply(Command::Forward, 4.).unwrap();
    assert_eq!(f.current.as_ref().unwrap().page, "b");
    // A multi-entry return uses the actual source recipe, including Suppress.
    let mut f = Frame::default();
    nav(&mut f, "a", C::Disabled, T::Entrance, 0.);
    let id = f.current.as_ref().unwrap().id;
    nav(&mut f, "b", C::Disabled, T::Entrance, 1.);
    nav(&mut f, "c", C::Disabled, T::Suppress, 2.);
    f.apply(Command::Traverse { entry: id }, 3.).unwrap();
    assert!(!f.snapshot(3.).animating);
}

#[test]
fn navigation_view_recommends_directional_transitions_and_respects_backdrop_capability() {
    use winui_wasm::{
        model::{EventKind, Input, Item, PaneDisplayMode, Properties},
        navigation::NavigationView,
        render::{display_list, Draw},
    };
    let props = Properties {
        items: vec![
            Item {
                id: "a".into(),
                text: "A".into(),
                ..Item::default()
            },
            Item {
                id: "b".into(),
                text: "B".into(),
                ..Item::default()
            },
        ],
        selected_id: Some("a".into()),
        pane_display_mode: PaneDisplayMode::Top,
        ..Properties::default()
    };
    let mut view = NavigationView::new(props).unwrap();
    view.input(Input::Focus { id: "b".into() }, 0.).unwrap();
    view.input(
        Input::Key {
            key: "Enter".into(),
        },
        0.,
    )
    .unwrap();
    let event = view
        .snapshot()
        .events
        .into_iter()
        .find(|e| e.kind == EventKind::ItemInvoked)
        .unwrap();
    assert_eq!(
        event.recommended_navigation_transition,
        Some(T::SlideFromRight)
    );
    view.update(serde_json::json!([{"paneDisplayMode":"LeftCompact","isPaneOpen":true,"isBackdropAvailable":false}])).unwrap();
    assert!(!view.props.reduced_transparency);
    assert!(!display_list(&view)
        .iter()
        .any(|op| matches!(op, Draw::Acrylic { .. })));
}
