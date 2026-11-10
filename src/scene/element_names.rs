//! Scene-scoped ElementName bindings. The host submits declarations, never polls
//! controllers or resolves names during React rendering.
use super::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ElementReferenceProperty {
    PlacementTarget,
    FlyoutTarget,
    ContextFlyoutTarget,
    PrimitiveSource,
    PrimitiveScrollTarget,
    ReadingScrollTarget,
    LabelItemSource,
    OverflowContentTarget,
    ViewSource,
    Command,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnresolvedElementReference {
    pub source: u32,
    pub property: ElementReferenceProperty,
    pub target_name: String,
}
impl ElementReferenceProperty {
    fn get(self, p: &NodeProperties) -> Option<u32> {
        match self {
            Self::PlacementTarget => p.placement_target,
            Self::FlyoutTarget => p.flyout_target,
            Self::ContextFlyoutTarget => p.context_flyout_target,
            Self::PrimitiveSource => p.primitives.as_ref().and_then(|q| q.source),
            Self::PrimitiveScrollTarget => p.primitives.as_ref().and_then(|q| q.scroll_target),
            Self::ReadingScrollTarget => p.reading.as_ref().and_then(|q| q.scroll_target),
            Self::LabelItemSource => p.reading.as_ref().and_then(|q| q.label_item_source),
            Self::OverflowContentTarget => {
                p.reading.as_ref().and_then(|q| q.overflow_content_target)
            }
            Self::ViewSource => p.view_controls.as_ref().and_then(|q| q.source),
            Self::Command => p.view_controls.as_ref().and_then(|q| q.command),
        }
    }
    fn set(self, p: &mut NodeProperties, value: Option<u32>) {
        match self {
            Self::PlacementTarget => p.placement_target = value,
            Self::FlyoutTarget => p.flyout_target = value,
            Self::ContextFlyoutTarget => p.context_flyout_target = value,
            Self::PrimitiveSource => {
                p.primitives.get_or_insert_with(Default::default).source = value
            }
            Self::PrimitiveScrollTarget => {
                p.primitives
                    .get_or_insert_with(Default::default)
                    .scroll_target = value
            }
            Self::ReadingScrollTarget => {
                p.reading.get_or_insert_with(Default::default).scroll_target = value
            }
            Self::LabelItemSource => {
                p.reading
                    .get_or_insert_with(Default::default)
                    .label_item_source = value
            }
            Self::OverflowContentTarget => {
                p.reading
                    .get_or_insert_with(Default::default)
                    .overflow_content_target = value
            }
            Self::ViewSource => p.view_controls.get_or_insert_with(Default::default).source = value,
            Self::Command => p.view_controls.get_or_insert_with(Default::default).command = value,
        }
    }
    fn owner_valid(self, kind: NodeKind) -> bool {
        match self {
            Self::PrimitiveSource => kind == NodeKind::TickBar,
            Self::PrimitiveScrollTarget => kind == NodeKind::ScrollBar,
            Self::ReadingScrollTarget | Self::LabelItemSource => {
                kind == NodeKind::AnnotatedScrollBar
            }
            Self::OverflowContentTarget => matches!(
                kind,
                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
            ),
            Self::ViewSource => kind == NodeKind::ParallaxView,
            _ => true,
        }
    }
    fn target_valid(self, kind: NodeKind) -> bool {
        match self {
            Self::PrimitiveSource => kind == NodeKind::Slider,
            Self::PrimitiveScrollTarget | Self::ReadingScrollTarget | Self::ViewSource => {
                collections::is_scroll_owner(kind)
            }
            Self::LabelItemSource => kind == NodeKind::ItemsRepeater,
            Self::OverflowContentTarget => kind == NodeKind::RichTextBlockOverflow,
            Self::Command => matches!(kind, NodeKind::UICommand | NodeKind::StandardCommand),
            Self::FlyoutTarget | Self::ContextFlyoutTarget => matches!(
                kind,
                NodeKind::Flyout | NodeKind::MenuFlyout | NodeKind::CommandBarFlyout
            ),
            Self::PlacementTarget => true,
        }
    }
}
impl Scene {
    pub(super) fn validate_element_names(
        &self,
        changed: &[(u32, NodeKind, &NodeProperties)],
    ) -> Result<(), String> {
        let overrides: std::collections::HashSet<_> =
            changed.iter().map(|(id, _, _)| *id).collect();
        let all: Vec<_> = self
            .nodes
            .values()
            .filter(|n| !overrides.contains(&n.id))
            .map(|n| (n.id, n.kind, &n.props))
            .chain(changed.iter().copied())
            .collect();
        let mut names = BTreeMap::new();
        for &(id, kind, p) in &all {
            if !p.name.is_empty() && names.insert(p.name.as_str(), (id, kind)).is_some() {
                return Err(format!("duplicate element name: {}", p.name));
            }
        }
        let mut overflow = BTreeMap::new();
        let mut commands = BTreeMap::new();
        for &(id, kind, p) in &all {
            for (&property, name) in &p.element_references {
                if let Some(name) = name {
                    if name.is_empty() || !property.owner_valid(kind) {
                        return Err(format!("invalid named reference {property:?}"));
                    }
                    if let Some(&(target, target_kind)) = names.get(name.as_str()) {
                        if id == target || !property.target_valid(target_kind) {
                            return Err(format!(
                                "{property:?} requires a compatible target, got {name}"
                            ));
                        }
                        if property == ElementReferenceProperty::PlacementTarget
                            && self.nodes.contains_key(&id)
                            && self.descendant_of(target, id)
                        {
                            return Err(
                                "placement target must be outside its content subtree".into()
                            );
                        }
                    }
                }
            }
            if matches!(
                kind,
                NodeKind::RichTextBlock | NodeKind::RichTextBlockOverflow
            ) {
                let bound = p
                    .element_references
                    .get(&ElementReferenceProperty::OverflowContentTarget)
                    .and_then(|n| n.as_ref());
                let target = if let Some(name) = bound {
                    names.get(name.as_str()).map(|(id, _)| *id)
                } else {
                    ElementReferenceProperty::OverflowContentTarget.get(p)
                };
                if let Some(target) = target {
                    overflow.insert(id, target);
                }
            }
            if matches!(kind, NodeKind::UICommand | NodeKind::StandardCommand) {
                let bound = p
                    .element_references
                    .get(&ElementReferenceProperty::Command)
                    .and_then(|n| n.as_ref());
                let target = if let Some(name) = bound {
                    names.get(name.as_str()).map(|(id, _)| *id)
                } else {
                    ElementReferenceProperty::Command.get(p)
                };
                if let Some(target) = target {
                    commands.insert(id, target);
                }
            }
        }
        for (graph, message) in [
            (&overflow, "text overflow reference cycle"),
            (&commands, "command reference cycle"),
        ] {
            for &start in graph.keys() {
                let mut at = start;
                let mut seen = std::collections::HashSet::new();
                while let Some(&next) = graph.get(&at) {
                    if !seen.insert(at) {
                        return Err(message.into());
                    }
                    at = next;
                }
            }
        }
        Ok(())
    }
    pub(super) fn validate_named_reparent(&self, id: u32, parent: u32) -> Result<(), String> {
        for source in self.nodes.values() {
            let target = source
                .props
                .element_references
                .get(&ElementReferenceProperty::PlacementTarget)
                .and_then(|n| n.as_ref())
                .and_then(|name| self.nodes.values().find(|n| n.props.name == *name))
                .map(|n| n.id);
            if target.is_some_and(|target| self.descendant_of(target, id))
                && self.descendant_of(parent, source.id)
            {
                return Err("placement target must be outside its content subtree".into());
            }
        }
        Ok(())
    }
    pub(super) fn resolve_element_names(&mut self) {
        if !self.element_references_dirty {
            return;
        }
        self.element_references_dirty = false;
        let names: BTreeMap<_, _> = self
            .nodes
            .values()
            .filter(|n| !n.props.name.is_empty())
            .map(|n| (n.props.name.clone(), n.id))
            .collect();
        let mut changes = vec![];
        let mut unresolved = vec![];
        for n in self.nodes.values() {
            for (&property, name) in &n.props.element_references {
                if let Some(name) = name {
                    let target = names.get(name).copied();
                    if target.is_none() {
                        unresolved.push(UnresolvedElementReference {
                            source: n.id,
                            property,
                            target_name: name.clone(),
                        });
                    }
                    if property.get(&n.props) != target {
                        changes.push((n.id, property, target));
                    }
                }
            }
        }
        for (id, property, target) in changes {
            property.set(&mut self.nodes.get_mut(&id).unwrap().props, target);
            self.invalidate(id, true);
        }
        self.unresolved_element_references = unresolved;
    }
    pub(super) fn placement_reference_ready(&self, id: u32) -> bool {
        let p = &self.nodes[&id].props;
        p.element_references
            .get(&ElementReferenceProperty::PlacementTarget)
            .and_then(|n| n.as_ref())
            .is_none()
            || p.placement_target.is_some()
    }
}
