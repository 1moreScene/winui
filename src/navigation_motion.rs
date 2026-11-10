//! NavigationView.cpp::CreateAndAttachHeaderAnimation and NavigationViewItem's
//! AnimatedChevronUpDownSmallVisualSource. Layout changes are immediate; existing
//! item visuals travel to their new offsets for 200 ms (not an accordion height).
use crate::{
    animated_icon::Player,
    animation::Motion,
    model::{AnimatedIconSource, Part, Rect},
};
use serde::Serialize;
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reposition {
    duration_ms: f64,
    curve: [f64; 4],
}
fn recipe() -> &'static Reposition {
    static RECIPE: std::sync::OnceLock<Reposition> = std::sync::OnceLock::new();
    RECIPE.get_or_init(|| {
        let contract: serde_json::Value = serde_json::from_str(include_str!(
            "../references/navigation-motion-contract.json"
        ))
        .expect("NavigationView source contract");
        serde_json::from_value(contract["reposition"].clone()).unwrap()
    })
}
/// NavigationView's RootSplitView uses CompactInline on the left in Expanded
/// mode, CompactOverlay in Compact mode, and Overlay in Minimal mode.
pub fn pane_timing(mode: crate::model::DisplayMode, open: bool) -> (f64, [f64; 4]) {
    static PANE: std::sync::OnceLock<std::collections::HashMap<String, Reposition>> = std::sync::OnceLock::new();
    let profiles = PANE.get_or_init(|| {
        let contract: serde_json::Value = serde_json::from_str(include_str!("../references/navigation-motion-contract.json")).unwrap();
        serde_json::from_value(contract["pane"].clone()).expect("SplitView pane source tracks")
    });
    let prefix = match mode { crate::model::DisplayMode::Expanded => "inline", crate::model::DisplayMode::Compact => "compact", _ => "overlay" };
    let profile = &profiles[&format!("{prefix}{}", if open { "Open" } else { "Close" })];
    (profile.duration_ms, profile.curve)
}
use std::collections::{HashMap, HashSet};

#[derive(Default)]
struct Row {
    target: f64,
    local_target: f64,
    parent: Option<String>,
    motion: Motion,
}
#[derive(Default)]
pub struct HierarchyMotion {
    rows: HashMap<String, Row>,
    pub chevrons: HashMap<String, Player>,
    pub pending: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Visual {
    pub id: String,
    pub layout_y: f64,
    pub offset_y: f64,
    pub chevron: Option<crate::animated_icon::Snapshot>,
}
impl HierarchyMotion {
    pub fn arrange(
        &mut self,
        parts: &mut Vec<Part>,
        menu_clip: Rect,
        scroll: f64,
        time: f64,
        reduced: bool,
    ) {
        let targets: Vec<_> = parts
            .iter()
            .filter(|p| !p.id.starts_with('$'))
            .map(|p| {
                (
                    p.id.clone(),
                    p.rect.y
                        + if p.clip == Some(menu_clip) {
                            scroll
                        } else {
                            0.
                        },
                    p.depth,
                )
            })
            .collect();
        {
            let retained: HashSet<&str> = targets.iter().map(|(key, _, _)| key.as_str()).collect();
            self.rows.retain(|id, _| retained.contains(id.as_str()));
        }
        let mut ancestry: Vec<String> = vec![];
        for (id, target, depth) in targets {
            ancestry.truncate(depth);
            let parent = ancestry.last().cloned();
            let local_target = target
                - parent
                    .as_ref()
                    .and_then(|p| self.rows.get(p))
                    .map_or(0., |r| r.target);
            let row = self.rows.entry(id.clone()).or_insert_with(|| Row {
                target,
                local_target,
                parent: parent.clone(),
                motion: Motion {
                    curve: recipe().curve,
                    ..Motion::default()
                },
            });
            if reduced {
                row.motion.snap(0.);
            }
            if (row.local_target - local_target).abs() > 0.001 || row.parent != parent {
                if self.pending && !reduced && row.parent == parent {
                    let from = row.local_target + row.motion.value(time) - local_target;
                    row.motion.snap(from);
                    row.motion.retarget(0., time, recipe().duration_ms);
                } else {
                    row.motion.snap(0.);
                }
            }
            row.target = target;
            row.local_target = local_target;
            row.parent = parent;
            ancestry.push(id);
        }
        self.pending = false;
        for part in parts.iter_mut() {
            let owner = part.id.strip_prefix("$expand:").unwrap_or(&part.id);
            part.rect.y += self.offset(owner, time);
        }
        parts.retain(|part| {
            part.clip.is_none_or(|clip| {
                part.rect.y < clip.y + clip.height
                    && part.rect.y + part.rect.height > clip.y
                    && part.rect.width > 0.
            })
        });
    }
    pub fn sync_chevrons(
        &mut self,
        parts: &[Part],
        hovered: Option<&str>,
        pressed: Option<&str>,
        time: f64,
        reduced: bool,
        visible: bool,
    ) {
        self.chevrons
            .retain(|id, _| visible&&parts.iter().any(|p| p.id == *id && p.expanded.is_some()));
        if !visible{return;}
        for part in parts.iter().filter(|p| p.expanded.is_some()) {
            let over = hovered.is_some_and(|id| {
                id == part.id || id.strip_prefix("$expand:") == Some(part.id.as_str())
            });
            // The native chevron presenter handles PointerPressed before the
            // NavigationViewItem: its arrow click keeps the parent PointerOver.
            let press = pressed==Some(part.id.as_str());
            let pointer = if press && part.enabled {
                "Pressed"
            } else if over && part.enabled {
                "PointerOver"
            } else {
                "Normal"
            };
            let state = format!(
                "{pointer}{}",
                if part.expanded == Some(true) {
                    "On"
                } else {
                    "Off"
                }
            );
            self.chevrons.entry(part.id.clone()).or_default().sync(
                AnimatedIconSource::ChevronUpDownSmall,
                &state,
                time,
                reduced,
                true,
            );
        }
    }
    pub fn advance(&mut self, time: f64, reduced: bool) {
        for row in self.rows.values_mut() {
            if reduced {
                row.motion.snap(0.);
            }
        }
        for player in self.chevrons.values_mut() {
            player.advance(time, reduced);
        }
    }
    fn offset(&self, id: &str, time: f64) -> f64 {
        let mut result = 0.;
        let mut current = self.rows.get(id);
        while let Some(row) = current {
            result += row.motion.value(time);
            current = row.parent.as_ref().and_then(|p| self.rows.get(p));
        }
        result
    }
    pub fn active(&self, time: f64) -> bool {
        self.rows.values().any(|r| r.motion.active(time))
            || self.chevrons.values().any(Player::active)
    }
    pub fn snapshot(&self, time: f64) -> Vec<Visual> {
        let mut result: Vec<_> = self
            .rows
            .iter()
            .map(|(id, row)| Visual {
                id: id.clone(),
                layout_y: row.target,
                offset_y: self.offset(id, time),
                chevron: self.chevrons.get(id).map(|p| p.snapshot(time)),
            })
            .collect();
        result.sort_by(|a, b| a.id.cmp(&b.id));
        result
    }
}
