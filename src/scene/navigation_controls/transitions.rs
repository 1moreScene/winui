//! TabViewListView's Entrance/AddDelete/Reorder transitions. Values are measured
//! by Windows.UI.Core.AnimationMetrics on the same SDK host, not guessed CSS.
use super::*;
#[derive(Clone)]
pub(super) struct TabEntry {
    opacity: Motion,
    scale: Motion,
    y: Motion,
}
#[derive(Clone)]
pub(super) struct TabGhost {
    pub key: String,
    pub rect: Rect,
    pub commands: Vec<Draw>,
    pub entry: TabEntry,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabVisual {
    pub key: String,
    pub removed: bool,
    pub opacity: f64,
    pub scale: f64,
    pub offset_y: f64,
}
fn metrics() -> &'static Value {
    static VALUE: OnceLock<Value> = OnceLock::new();
    VALUE.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../references/navigation-controls-animation-metrics.json"
        ))
        .unwrap()
    })
}
fn track(effect: &str, kind: &str) -> &'static Value {
    metrics()["effects"][effect]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["type"] == kind)
        .unwrap()
}
fn motion(from: f64, to: f64, now: f64, a: &Value) -> Motion {
    let mut m = Motion::default();
    m.snap(from);
    m.curve = std::array::from_fn(|i| a["curve"][i].as_f64().unwrap());
    m.retarget(
        to,
        now + a["delayMs"].as_f64().unwrap(),
        a["durationMs"].as_f64().unwrap(),
    );
    m
}
impl TabEntry {
    fn steady() -> Self {
        let mut v = Self {
            opacity: Motion::default(),
            scale: Motion::default(),
            y: Motion::default(),
        };
        v.opacity.snap(1.);
        v.scale.snap(1.);
        v.y.snap(0.);
        v
    }
    fn enter(now: f64) -> Self {
        let mut v = Self::steady();
        v.opacity = motion(0., 1., now, track("EnterPage-Primary", "Opacity"));
        v.y = motion(
            metrics()["entranceDefaults"]["y"].as_f64().unwrap(),
            0.,
            now,
            track("EnterPage-Primary", "Translation"),
        );
        v
    }
    fn add(now: f64) -> Self {
        let mut v = Self::steady();
        v.opacity = motion(0., 1., now, track("AddToList-Added", "Opacity"));
        let a = track("AddToList-Added", "Scale");
        v.scale = motion(a["values"]["InitialScaleX"].as_f64().unwrap(), 1., now, a);
        v
    }
    fn leave(&self, now: f64) -> Self {
        let mut v = self.clone();
        v.opacity = motion(
            self.opacity.value(now),
            0.,
            now,
            track("DeleteFromList-Deleted", "Opacity"),
        );
        let a = track("DeleteFromList-Deleted", "Scale");
        v.scale = motion(
            self.scale.value(now),
            a["values"]["FinalScaleX"].as_f64().unwrap(),
            now,
            a,
        );
        v.y.snap(self.y.value(now));
        v
    }
    pub(super) fn active(&self, now: f64) -> bool {
        self.opacity.active(now) || self.scale.active(now) || self.y.active(now)
    }
    fn visual(&self, key: String, removed: bool, now: f64) -> TabVisual {
        TabVisual {
            key,
            removed,
            opacity: self.opacity.value(now),
            scale: self.scale.value(now),
            offset_y: self.y.value(now),
        }
    }
}
impl NavigationState {
    pub(in crate::scene) fn tab_visual(&self, key: &str, time: f64) -> TabVisual {
        self.tab_entries
            .get(key)
            .unwrap_or(&TabEntry::steady())
            .visual(key.into(), false, time)
    }
    pub(super) fn tab_visuals(&self, time: f64) -> Vec<TabVisual> {
        let mut v = self
            .tab_entries
            .iter()
            .map(|(k, e)| e.visual(k.clone(), false, time))
            .collect::<Vec<_>>();
        v.extend(
            self.tab_ghosts
                .iter()
                .map(|g| g.entry.visual(g.key.clone(), true, time)),
        );
        v
    }
}
impl Scene {
    pub(super) fn sync_tab_transitions(&mut self, id: u32, source_changed: bool) {
        let n = &self.nodes[&id];
        let reduce =
            self.reduced_motion || n.theme == Theme::HighContrast || !n.enabled || !n.visible;
        let initial = !n.nav_controls.initialized;
        let old = n
            .nav_controls
            .source
            .iter()
            .map(|i| i.id.clone())
            .collect::<HashSet<_>>();
        let next = n
            .props
            .nav_controls
            .items
            .iter()
            .map(|i| i.id.clone())
            .collect::<HashSet<_>>();
        // Match TabView::UpdateListViewItemContainerTransitions for bound, reorderable
        // cross-drop sources: these remove AddDelete/Content to avoid reparent races.
        let add_delete =
            !(n.props.nav_controls.can_reorder_tabs && n.props.nav_controls.allow_drop_tabs);
        let c = &mut self.nodes.get_mut(&id).unwrap().nav_controls;
        c.tab_ghosts
            .retain(|g| g.entry.active(self.time) && !next.contains(&g.key));
        if reduce {
            c.tab_ghosts.clear();
            for e in c.tab_entries.values_mut() {
                *e = TabEntry::steady();
            }
        }
        if !source_changed {
            return;
        }
        let removed = old.difference(&next).cloned().collect::<Vec<_>>();
        let added = next.difference(&old).cloned().collect::<Vec<_>>();
        if !reduce && !initial && add_delete {
            for key in &removed {
                if let (Some(commands), Some(part)) = (
                    c.tab_cache.get(key),
                    c.parts.iter().find(|p| p.role == "tab" && p.key == *key),
                ) {
                    let entry = c
                        .tab_entries
                        .get(key)
                        .cloned()
                        .unwrap_or_else(TabEntry::steady)
                        .leave(self.time);
                    c.tab_ghosts.push(TabGhost {
                        key: key.clone(),
                        rect: part.rect,
                        commands: commands.clone(),
                        entry,
                    });
                }
            }
        }
        c.tab_entries.retain(|k, _| next.contains(k));
        c.tab_cache.retain(|k, _| next.contains(k));
        for key in added {
            c.tab_entries.insert(
                key,
                if reduce {
                    TabEntry::steady()
                } else if initial || !add_delete {
                    TabEntry::enter(self.time)
                } else {
                    TabEntry::add(self.time)
                },
            );
        }
        if !initial {
            let a = if add_delete && !removed.is_empty() {
                track("DeleteFromList-Remaining", "Translation")
            } else if add_delete && next.difference(&old).next().is_some() {
                track("AddToList-Affected", "Translation")
            } else {
                track("Reposition-Primary", "Translation")
            };
            c.tab_shift = Some((
                self.time,
                a["delayMs"].as_f64().unwrap(),
                a["durationMs"].as_f64().unwrap(),
            ));
        }
    }
    pub(in crate::scene) fn tab_visual_commands(v: &TabVisual, r: Rect, out: &mut Vec<Draw>) {
        out.push(Draw::Layer { opacity: v.opacity });
        out.push(Draw::Save);
        out.push(Draw::Transform {
            matrix: [
                v.scale,
                0.,
                0.,
                v.scale,
                (r.x + r.width / 2.) * (1. - v.scale),
                (r.y + r.height / 2.) * (1. - v.scale) + v.offset_y,
            ],
        });
    }
    pub(super) fn paint_tab_ghosts(&self, id: u32, out: &mut Vec<Draw>) {
        for g in &self.nodes[&id].nav_controls.tab_ghosts {
            let v = g.entry.visual(g.key.clone(), true, self.time);
            Self::tab_visual_commands(&v, g.rect, out);
            out.extend(g.commands.iter().cloned());
            out.push(Draw::Restore);
            out.push(Draw::EndLayer);
        }
    }
}
