//! Frame journal, page-type cache and navigation transition compositor.
//! Sources: Frame_Partial.cpp, NavigationCache.cpp and ThemeTransitions.cpp
//! at the pinned WinUI commit in references/frame-sources.json.
use crate::{
    animation::bezier,
    enums::{NavigationCacheMode, NavigationMode, NavigationTransition},
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, VecDeque};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: u32,
    pub page: String,
    pub parameter: u32,
    pub transition: NavigationTransition,
    pub cache_mode: NavigationCacheMode,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub instance: u32,
    pub page: String,
    pub cache_mode: NavigationCacheMode,
}
#[derive(Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Command {
    Navigate {
        page: String,
        parameter: u32,
        transition: NavigationTransition,
        #[serde(rename = "cacheMode")]
        cache_mode: NavigationCacheMode,
    },
    Back,
    Forward,
    Refresh,
    Traverse {
        entry: u32,
    },
    Configure {
        #[serde(rename = "cacheSize")]
        cache_size: usize,
        #[serde(rename = "reducedMotion")]
        reduced_motion: bool,
    },
    ClearHistory,
    CacheMode {
        page: String,
        mode: NavigationCacheMode,
    },
}
#[derive(Clone, Copy, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Visual {
    pub instance: u32,
    pub x: f64,
    pub y: f64,
    pub opacity: f64,
    /// Keep an incoming transparent page in layout so its content can prepare.
    pub visible: bool,
    /// The core, rather than a host-specific animation callback, owns hit testing.
    pub interactive: bool,
    /// Explicit paint order, independent of cached instance allocation order.
    pub z_index: u32,
}
impl Visual {
    fn presented(instance: u32, x: f64, y: f64, opacity: f64) -> Self {
        Self {
            instance,
            x,
            y,
            opacity,
            visible: true,
            interactive: false,
            z_index: 0,
        }
    }
    fn hidden(instance: u32) -> Self {
        Self {
            visible: false,
            ..Self::presented(instance, 0., 0., 0.)
        }
    }
}
#[derive(Clone)]
struct Transition {
    old: u32,
    new: u32,
    start: f64,
    kind: NavigationTransition,
    back: bool,
    from: Visual,
    outgoing_active: bool,
}
#[derive(Clone)]
pub struct Frame {
    pub current: Option<Entry>,
    pub back: Vec<Entry>,
    pub forward: Vec<Entry>,
    current_instance: Option<u32>,
    next: u32,
    pages: BTreeMap<u32, Page>,
    cache: BTreeMap<String, u32>,
    mru: VecDeque<String>,
    capacity: usize,
    reduced: bool,
    transition: Option<Transition>,
    exits: Vec<Transition>,
    pub mode: NavigationMode,
}
impl Default for Frame {
    fn default() -> Self {
        Self {
            current: None,
            back: vec![],
            forward: vec![],
            current_instance: None,
            next: 0,
            pages: BTreeMap::new(),
            cache: BTreeMap::new(),
            mru: VecDeque::new(),
            capacity: 10,
            reduced: false,
            transition: None,
            exits: vec![],
            mode: NavigationMode::New,
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub current: Option<Entry>,
    pub current_instance: Option<u32>,
    pub back_stack: Vec<Entry>,
    pub forward_stack: Vec<Entry>,
    pub pages: Vec<Page>,
    pub visuals: Vec<Visual>,
    pub animating: bool,
    pub cache_size: usize,
    pub mode: NavigationMode,
}
impl Frame {
    fn allocate(&mut self) -> Result<u32, String> {
        self.next = self
            .next
            .checked_add(1)
            .ok_or("Frame identity space exhausted")?;
        Ok(self.next)
    }
    fn trim(&mut self) {
        while self.mru.len() > self.capacity {
            if let Some(key) = self.mru.pop_front() {
                self.cache.remove(&key);
            }
        }
    }
    fn cache_page(&mut self, id: u32) {
        let p = &self.pages[&id];
        let key = p.page.clone();
        let mode = p.cache_mode;
        self.mru.retain(|s| s != &key);
        self.cache.remove(&key);
        // Pinned NavigationCache::GetContent gates newly cached pages on CacheSize >= 1.
        if self.capacity > 0 && mode != NavigationCacheMode::Disabled {
            self.cache.insert(key.clone(), id);
            if mode == NavigationCacheMode::Enabled {
                self.mru.push_back(key);
                self.trim();
            }
        }
    }
    fn prune(&mut self) {
        let current = self.current_instance;
        let transition = self.transition.as_ref();
        let cache = &self.cache;
        let exits = &self.exits;
        self.pages.retain(|id, _| {
            Some(*id) == current
                || cache.values().any(|v| v == id)
                || transition.is_some_and(|t| t.outgoing_active && t.old == *id)
                || exits.iter().any(|t| t.old == *id)
        });
    }
    pub fn advance(&mut self, time: f64) {
        self.exits.retain(|t| time < t.start + 150.);
        if let Some(t) = &mut self.transition {
            t.outgoing_active = time < t.start + 150.;
        }
        if self
            .transition
            .as_ref()
            .is_some_and(|t| time >= t.start + 450.)
        {
            self.transition = None;
        }
        self.prune();
    }
    pub fn apply(&mut self, command: Command, time: f64) -> Result<(), String> {
        self.apply_core(command, time, None)
    }
    fn apply_core(
        &mut self,
        command: Command,
        time: f64,
        back_transition: Option<NavigationTransition>,
    ) -> Result<(), String> {
        if !time.is_finite() {
            return Err("Frame time must be finite".into());
        }
        if let Command::Traverse { entry } = command {
            if self.current.as_ref().is_some_and(|e| e.id == entry) {
                return Ok(());
            }
            let back = self.back.iter().position(|e| e.id == entry);
            let forward = self.forward.iter().position(|e| e.id == entry);
            let (target, mode) = if let Some(i) = back {
                (i, true)
            } else if let Some(i) = forward {
                (i, false)
            } else {
                return Err("Journal entry no longer exists".into());
            };
            // Move the journal directly: intermediate pages must not be instantiated or notified.
            let source_transition = self.current.as_ref().map(|e| e.transition);
            if mode {
                while self.back.len() > target + 1 {
                    self.forward.push(self.current.take().unwrap());
                    self.current = self.back.pop();
                }
            } else {
                while self.forward.len() > target + 1 {
                    self.back.push(self.current.take().unwrap());
                    self.current = self.forward.pop();
                }
            }
            return self.apply_core(
                if mode {
                    Command::Back
                } else {
                    Command::Forward
                },
                time,
                if mode { source_transition } else { None },
            );
        }
        self.advance(time);
        let (entry, mode, cache_mode) = match command {
            Command::Configure {
                cache_size,
                reduced_motion,
            } => {
                if cache_size > 10000 {
                    return Err("CacheSize exceeds 10000".into());
                }
                self.capacity = cache_size;
                self.reduced = reduced_motion;
                if self.reduced {
                    self.transition = None;
                    self.exits.clear();
                }
                self.trim();
                self.prune();
                return Ok(());
            }
            Command::ClearHistory => {
                self.back.clear();
                self.forward.clear();
                return Ok(());
            }
            Command::CacheMode { page, mode } => {
                for entry in self
                    .back
                    .iter_mut()
                    .chain(self.forward.iter_mut())
                    .chain(self.current.iter_mut())
                {
                    if entry.page == page {
                        entry.cache_mode = mode;
                    }
                }
                let id = self.cache.get(&page).copied().or_else(|| {
                    self.current_instance
                        .filter(|id| self.pages[id].page == page)
                });
                if let Some(id) = id {
                    if self.pages[&id].cache_mode != mode {
                        self.pages.get_mut(&id).unwrap().cache_mode = mode;
                        self.cache_page(id);
                    }
                }
                self.prune();
                return Ok(());
            }
            Command::Navigate {
                page,
                parameter,
                transition,
                cache_mode,
            } => {
                if page.is_empty() {
                    return Err("Page identity cannot be empty".into());
                }
                let entry = Entry {
                    id: self.allocate()?,
                    page,
                    parameter,
                    transition,
                    cache_mode,
                };
                (entry, NavigationMode::New, cache_mode)
            }
            Command::Back => {
                let e = self.back.last().ok_or("No back entry")?.clone();
                let mode = e.cache_mode;
                (e, NavigationMode::Back, mode)
            }
            Command::Forward => {
                let e = self.forward.last().ok_or("No forward entry")?.clone();
                let mode = e.cache_mode;
                (e, NavigationMode::Forward, mode)
            }
            Command::Refresh => {
                let e = self.current.clone().ok_or("No current page")?;
                (e, NavigationMode::Refresh, NavigationCacheMode::Disabled)
            }
            Command::Traverse { .. } => unreachable!(),
        };
        let transition_kind = if mode == NavigationMode::Back {
            back_transition.unwrap_or_else(|| {
                self.current
                    .as_ref()
                    .map_or(entry.transition, |e| e.transition)
            })
        } else {
            entry.transition
        };
        let old = self.current_instance;
        let from = old.and_then(|id| self.visuals(time).into_iter().find(|v| v.instance == id));
        let instance = if mode == NavigationMode::Refresh {
            old.unwrap()
        } else if let Some(id) = self.cache.get(&entry.page).copied() {
            if self.pages[&id].cache_mode == NavigationCacheMode::Enabled {
                self.mru.retain(|p| p != &entry.page);
                self.mru.push_back(entry.page.clone());
            }
            id
        } else {
            let id = self.allocate()?;
            self.pages.insert(
                id,
                Page {
                    instance: id,
                    page: entry.page.clone(),
                    cache_mode,
                },
            );
            self.cache_page(id);
            id
        };
        if let Some(current) = self.current.take() {
            match mode {
                NavigationMode::New => {
                    self.back.push(current);
                    self.forward.clear();
                }
                NavigationMode::Back => {
                    self.back.pop();
                    self.forward.push(current);
                }
                NavigationMode::Forward => {
                    self.forward.pop();
                    self.back.push(current);
                }
                NavigationMode::Refresh => {}
            }
        }
        if let Some(previous) = &self.transition {
            if previous.outgoing_active && previous.old != instance && Some(previous.old) != old {
                self.exits.push(previous.clone());
            }
        }
        self.exits
            .retain(|t| t.old != instance && Some(t.old) != old);
        if self.reduced || transition_kind == NavigationTransition::Suppress {
            self.exits.clear();
        }
        self.transition = old
            .filter(|id| *id != instance)
            .filter(|_| !self.reduced && transition_kind != NavigationTransition::Suppress)
            .map(|old| Transition {
                old,
                new: instance,
                start: time,
                kind: transition_kind,
                back: mode == NavigationMode::Back,
                from: from.unwrap_or(Visual::presented(old, 0., 0., 1.)),
                outgoing_active: true,
            });
        self.mode = mode;
        self.current_instance = Some(instance);
        self.current = Some(entry);
        self.prune();
        Ok(())
    }
    pub fn visuals(&self, time: f64) -> Vec<Visual> {
        // A total presentation frame: every retained page has one explicit state.
        // Omitting cached pages let hosts accidentally default them to opacity 1
        // between the last animation frame and their framework's next commit.
        let mut frame: BTreeMap<u32, Visual> = self
            .pages
            .keys()
            .map(|id| (*id, Visual::hidden(*id)))
            .collect();
        let interactive = !self.animating(time);
        for (layer, mut visual) in self.motion_visuals(time).into_iter().enumerate() {
            if !frame.contains_key(&visual.instance) {
                continue;
            }
            visual.interactive =
                interactive && Some(visual.instance) == self.current_instance && visual.visible;
            visual.z_index = if visual.visible { layer as u32 + 1 } else { 0 };
            frame.insert(visual.instance, visual);
        }
        let mut frame: Vec<_> = frame.into_values().collect();
        frame.sort_by_key(|visual| (visual.z_index, visual.instance));
        frame
    }
    pub(crate) fn animating(&self, time: f64) -> bool {
        self.transition
            .as_ref()
            .is_some_and(|t| time < t.start + 450.)
            || self.exits.iter().any(|t| time < t.start + 150.)
    }
    fn motion_visuals(&self, time: f64) -> Vec<Visual> {
        let Some(id) = self.current_instance else {
            return vec![];
        };
        let Some(t) = &self.transition else {
            let mut visuals: Vec<_> = self
                .exits
                .iter()
                .map(|t| Self::exit_visual(t, time))
                .collect();
            visuals.push(Visual::presented(id, 0., 0., 1.));
            return visuals;
        };
        let dt = (time - t.start).max(0.);
        let enter = bezier(((dt - 150.) / 300.).clamp(0., 1.), [0.1, 0.9, 0.2, 1.]);
        let old = Self::exit_visual(t, time);
        let mut new = Visual::presented(t.new, 0., 0., if dt < 150. { 0. } else { 1. });
        if t.kind == NavigationTransition::Entrance {
            if t.back {
                new.opacity = if dt < 150. { 0. } else { enter };
            } else {
                new.y = 140. * (1. - enter);
            }
        } else {
            let sign = if t.kind == NavigationTransition::SlideFromLeft {
                1.
            } else {
                -1.
            };
            new.x = if t.back { 150. } else { -200. } * sign * (1. - enter);
        }
        let mut visuals: Vec<_> = self
            .exits
            .iter()
            .map(|t| Self::exit_visual(t, time))
            .collect();
        visuals.extend([old, new]);
        visuals
    }
    fn exit_visual(t: &Transition, time: f64) -> Visual {
        let dt = (time - t.start).max(0.);
        let exit = bezier((dt / 150.).clamp(0., 1.), [0.7, 0., 1., 0.5]);
        let mut old = t.from;
        old.visible = dt < 150.;
        old.interactive = false;
        // ThemeTransitions.cpp has a discrete opacity=1 exit keyframe. Slide
        // and back-entrance also have discrete zero translation keyframes.
        old.opacity = if dt >= 150. {
            0.
        } else if t.kind == NavigationTransition::Entrance && !t.back {
            1. - exit
        } else {
            1.
        };
        if t.kind == NavigationTransition::Entrance {
            if t.back {
                old.y = 140. * exit;
            }
        } else {
            let sign = if t.kind == NavigationTransition::SlideFromLeft {
                1.
            } else {
                -1.
            };
            old.x = if t.back { -200. } else { 150. } * sign * exit;
        }
        old
    }
    pub fn snapshot(&self, time: f64) -> Snapshot {
        Snapshot {
            current: self.current.clone(),
            current_instance: self.current_instance,
            back_stack: self.back.clone(),
            forward_stack: self.forward.clone(),
            pages: self.pages.values().cloned().collect(),
            visuals: self.visuals(time),
            animating: self.animating(time),
            cache_size: self.capacity,
            mode: self.mode,
        }
    }
}
