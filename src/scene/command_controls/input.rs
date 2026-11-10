use super::*;
impl Scene {
    pub(super) fn init_command_bar(&mut self, id: u32) -> Result<(), String> {
        let more=self.create(id,NodeKind::Button,json!({"text":"\u{e712}","fontFamily":"Segoe Fluent Icons","fontSize":20,"padding":[0,0,0,0],"accessibleName":"More","width":48,"height":48,"minHeight":0,"variant":"Subtle"}))?;
        self.nodes.get_mut(&more).unwrap().command.owner = Some(id);
        self.nodes.get_mut(&more).unwrap().command.role = "more".into();
        let popup=self.create(id,NodeKind::Flyout,json!({"isOpen":false,"acrylicResource":"CommandBarOverflowPresenterBackground","borderBrush":{"resource":"CommandBarOverflowPresenterBorderBrush"},"placement":"BottomEdgeAlignedRight","placementTarget":id,"padding":[0,4,0,4],"minWidth":0,"autoFocus":true}))?;
        self.nodes.get_mut(&popup).unwrap().overlay.visual.profile = Some(NodeKind::CommandBar);
        self.nodes.get_mut(&popup).unwrap().command.owner = Some(id);
        self.nodes.get_mut(&popup).unwrap().command.role = "overflow".into();
        self.nodes.get_mut(&id).unwrap().command.more = Some(more);
        self.nodes.get_mut(&id).unwrap().command.popup = Some(popup);
        let panel = self.create(
            popup,
            NodeKind::StackPanel,
            json!({"horizontalAlignment":"Stretch"}),
        )?;
        self.nodes.get_mut(&id).unwrap().command.overflow_panel = Some(panel);
        let separator=self.create(panel,NodeKind::Border,json!({"visible":false,"height":8.+(self.dpr.round()/self.dpr),"horizontalAlignment":"Stretch"}))?;
        let n = self.nodes.get_mut(&separator).unwrap();
        n.command.separator = true;
        n.command.in_overflow = true;
        n.command.owner = Some(id);
        n.command.role = "overflow-separator".into();
        self.nodes.get_mut(&id).unwrap().command.overflow_separator = Some(separator);
        Ok(())
    }
    pub(super) fn sync_command_bar(&mut self, id: u32) -> Result<(), String> {
        {
            let n=self.nodes.get_mut(&id).unwrap();let target=if n.props.is_open{1.}else{0.};
            let reduce=self.reduced_motion||n.theme==Theme::HighContrast;
            if !n.command.expansion_initialized||reduce{n.command.expansion.snap(target);n.command.expansion_initialized=true;}
            else if n.command.expansion.to!=target{
                n.command.expansion.curve=std::array::from_fn(|i|motion()["barCurve"][i].as_f64().unwrap());
                n.command.expansion.retarget(target,self.time,motion()[if target==1.{"barOpenMs"}else{"barCloseMs"}].as_f64().unwrap());
            }
        }
        let expanded=self.command_expanded_template(id);
        let n = &self.nodes[&id];
        let primary = n.props.command_controls.primary_commands.clone();
        let secondary = n.props.command_controls.secondary_commands.clone();
        let signature = format!(
            "{:?}-{:?}-{}-{}",
            n.props.command_controls.default_label_position,
            n.props.command_controls.closed_display_mode,
            n.props.is_open,expanded
        );
        let changed = !Arc::ptr_eq(&primary, &n.command.source)
            || !Arc::ptr_eq(&secondary, &n.command.secondary);
        if !changed && signature == n.command.style_signature {
            return Ok(());
        }
        let q = n.props.command_controls.clone();
        let n = self.nodes.get_mut(&id).unwrap();
        if n.props.background.is_none() {
            n.props.acrylic_resource = if expanded {
                Some("CommandBarBackgroundOpen".into())
            } else {
                None
            };
        }
        let keys = primary
            .iter()
            .chain(secondary.iter())
            .map(|i| i.id.clone())
            .collect::<HashSet<_>>();
        let stale = self.nodes[&id]
            .command
            .primary
            .iter()
            .filter(|(k, _)| !keys.contains(*k))
            .map(|(_, id)| *id)
            .collect::<Vec<_>>();
        for child in stale {
            if self.nodes.contains_key(&child) {
                self.destroy(child)?;
            }
        }
        self.nodes
            .get_mut(&id)
            .unwrap()
            .command
            .primary
            .retain(|k, _| keys.contains(k));
        for item in primary.iter().chain(secondary.iter()) {
            let expected = match item.kind {
                CommandBarItemKind::Button => NodeKind::AppBarButton,
                CommandBarItemKind::Toggle => NodeKind::AppBarToggleButton,
                CommandBarItemKind::Separator => NodeKind::AppBarSeparator,
            };
            let old = self.nodes[&id].command.primary.get(&item.id).copied();
            let child = if let Some(old) = old.filter(|old| self.nodes[old].kind == expected) {
                old
            } else {
                if let Some(old) = old {
                    self.destroy(old)?;
                }
                let child = self.create(id, expected, json!({}))?;
                self.nodes
                    .get_mut(&id)
                    .unwrap()
                    .command
                    .primary
                    .insert(item.id.clone(), child);
                child
            };
            let patch = if expected == NodeKind::AppBarSeparator {
                json!({"width":5,"height":48,"visible":item.visible})
            } else {
                json!({"text":item.label,"accessibleName":item.label,"iconSource":item.icon_source,"enabled":item.enabled,"visible":item.visible,"isChecked":item.is_checked,"isThreeState":item.is_three_state,"flyoutTarget":item.flyout_target,"commandControls":{"label":item.label,"defaultLabelPosition":q.default_label_position,"isCompact":!expanded,"dynamicOverflowOrder":item.dynamic_overflow_order,"keyboardAccelerators":item.keyboard_accelerators}})
            };
            self.update(vec![Update { id: child, patch }])?;
            let c = &mut self.nodes.get_mut(&child).unwrap().command;
            c.owner = Some(id);
            c.role = item.id.clone();
            c.separator = expected == NodeKind::AppBarSeparator;
            self.nodes
                .get_mut(&child)
                .unwrap()
                .props
                .command_controls
                .inside_bar = true;
        }
        for child in self.nodes[&id]
            .command
            .primary
            .values()
            .copied()
            .collect::<Vec<_>>()
        {
            if is_action(self.nodes[&child].kind) {
                self.sync_command_action(child);
            }
        }
        let popup = self.nodes[&id].command.popup.unwrap();
        self.update(vec![Update {
            id: popup,
            patch: json!({"isLightDismissEnabled":!q.is_sticky}),
        }])?;
        let c = &mut self.nodes.get_mut(&id).unwrap().command;
        c.source = primary;
        c.secondary = secondary;
        c.style_signature = signature;
        Ok(())
    }
    pub(super) fn set_command_flyout(&mut self, id: u32, open: bool) -> Result<(), String> {
        let target = self.nodes[&id].props.flyout_target;
        if let Some(target) = target {
            if self.nodes.contains_key(&target) {
                self.update(vec![Update {
                    id: target,
                    patch: json!({"isOpen":open,"placementTarget":id}),
                }])?;
            }
        }
        Ok(())
    }
    pub(in crate::scene) fn pump_command_events(&mut self) {
        let mut at = 0;
        while at < self.events.len() {
            if self.events[at].command_processed {
                at += 1;
                continue;
            }
            self.events[at].command_processed = true;
            let e = self.events[at].clone();
            at += 1;
            if e.kind == EventKind::Closing {
                if let Some(owner) = self
                    .nodes
                    .get(&e.target)
                    .filter(|n| n.command.role == "overflow")
                    .and_then(|n| n.command.owner)
                {
                    let _ = self.update(vec![Update {
                        id: owner,
                        patch: json!({"isOpen":false}),
                    }]);
                }
                continue;
            }
            if e.kind != EventKind::Click {
                continue;
            }
            let Some(n) = self.nodes.get(&e.target) else {
                continue;
            };
            let kind = n.kind;
            let owner = n.command.owner;
            let role = n.command.role.clone();
            // Button_Partial.cpp::OnClick opens its associated Flyout after Click.
            if (kind == NodeKind::Button || is_action(kind)) && n.props.flyout_target.is_some() {
                let _ = self.set_command_flyout(e.target, true);
            }
            let Some(owner) = owner.filter(|id| {
                self.nodes
                    .get(id)
                    .is_some_and(|n| n.kind == NodeKind::CommandBar)
            }) else {
                continue;
            };
            if role == "more" {
                let open = !self.nodes[&owner].props.is_open;
                let _ = self.update(vec![Update {
                    id: owner,
                    patch: json!({"isOpen":open}),
                }]);
                self.invalidate(owner, true);
                continue;
            }
            let checked = self.nodes[&e.target].props.is_checked;
            if kind == NodeKind::AppBarToggleButton {
                let q = &mut self.nodes.get_mut(&owner).unwrap().props.command_controls;
                for item in Arc::make_mut(&mut q.primary_commands)
                    .iter_mut()
                    .chain(Arc::make_mut(&mut q.secondary_commands).iter_mut())
                {
                    if item.id == role {
                        item.is_checked = checked;
                    }
                }
            }
            self.emit(owner, EventKind::ItemClick);
            let event = self.events.last_mut().unwrap();
            event.item_id = Some(role.clone());
            event.payload = Some(json!({"command":{"id":role,"isChecked":checked}}));
            if !self.nodes[&owner].props.command_controls.is_sticky
                && self.nodes[&e.target].props.flyout_target.is_none()
            {
                let _ = self.update(vec![Update {
                    id: owner,
                    patch: json!({"isOpen":false}),
                }]);
            }
        }
    }
}

impl Scene {
    pub(in crate::scene) fn command_input(&mut self, input: &Input) -> Result<bool, String> {
        if matches!(input,Input::DismissCommandBars) {
            let bars=self.nodes.values().filter(|n|n.kind==NodeKind::CommandBar&&n.props.is_open&&!n.props.command_controls.is_sticky).map(|n|n.id).collect::<Vec<_>>();
            for id in bars{self.update(vec![Update{id,patch:json!({"isOpen":false})}])?;}
            return Ok(true);
        }
        if let Input::Down{x,y,..}=input {
            let bars=self.nodes.values().filter(|n|n.kind==NodeKind::CommandBar&&n.props.is_open&&!n.props.command_controls.is_sticky&&n.command.popup.is_none_or(|id|!self.nodes[&id].overlay.open)).filter(|n|{let (x,y)=n.world.inverse().unwrap_or_default().point(*x,*y);!self.command_primary_clip(n.id).contains(x,y)}).map(|n|n.id).collect::<Vec<_>>();
            for id in bars{self.update(vec![Update{id,patch:json!({"isOpen":false})}])?;}
        }
        if let Input::KeyDown{key,..}=input {
            if key=="Escape"&&!self.nodes.values().any(|n|overlays::is_overlay(n.kind)&&n.kind!=NodeKind::ToolTip&&n.overlay.open) {
                if let Some(id)=self.nodes.values().rev().find(|n|n.kind==NodeKind::CommandBar&&n.props.is_open&&n.command.popup.is_none_or(|id|!self.nodes[&id].overlay.open)).map(|n|n.id){
                    self.update(vec![Update{id,patch:json!({"isOpen":false})}])?;
                    self.focus(self.nodes[&id].command.more);
                    return Ok(true);
                }
            }
        }
        if let Input::CommandAccelerator {
            key,
            control,
            shift,
            alt,
        } = input
        {
            let found = self
                .nodes
                .values()
                .find(|n| {
                    is_action(n.kind)
                        && n.props.visible
                        && n.command
                            .owner
                            .and_then(|id| self.nodes.get(&id))
                            .map_or(n.visible, |owner| owner.visible)
                        && n.command.owner.map_or_else(
                            || self.effective_enabled(n.id),
                            |owner| n.props.enabled && self.effective_enabled(owner),
                        )
                        && n.props
                            .command_controls
                            .keyboard_accelerators
                            .iter()
                            .any(|a| {
                                a.key.eq_ignore_ascii_case(key)
                                    && a.modifiers.contains(&KeyboardAcceleratorModifier::Control)
                                        == *control
                                    && a.modifiers.contains(&KeyboardAcceleratorModifier::Shift)
                                        == *shift
                                    && a.modifiers.contains(&KeyboardAcceleratorModifier::Alt)
                                        == *alt
                            })
                })
                .map(|n| n.id);
            if let Some(id) = found {
                self.activate(id)?;
                self.pump_command_events();
            }
            return Ok(true);
        }
        let Input::KeyDown { key, repeat } = input else {
            return Ok(false);
        };
        let Some(id) = self.focused else {
            return Ok(false);
        };
        let n = &self.nodes[&id];
        if !n.enabled {
            return Ok(false);
        }
        if is_action(n.kind)
            && n.props.flyout_target.is_some()
            && matches!(key.as_str(), "ArrowDown" | "Alt+ArrowDown" | "F4")
        {
            if !repeat {
                self.set_command_flyout(id, true)?;
            }
            return Ok(true);
        }
        if n.command.role == "more" && key == "ArrowDown" {
            let owner = n.command.owner.unwrap();
            self.update(vec![Update {
                id: owner,
                patch: json!({"isOpen":true}),
            }])?;
            return Ok(true);
        }
        if let Some(owner) = n.command.owner.filter(|_| {
            matches!(
                key.as_str(),
                "ArrowLeft" | "ArrowRight" | "Home" | "End" | "ArrowUp" | "ArrowDown"
            )
        }) {
            let bar = &self.nodes[&owner];
            if bar.kind != NodeKind::CommandBar {
                return Ok(false);
            }
            let overflow = n.command.in_overflow;
            let mut ids = (if overflow {
                &bar.command.overflow
            } else {
                &bar.command.inline
            })
            .iter()
            .filter_map(|k| bar.command.primary.get(k).copied())
            .filter(|id| is_action(self.nodes[id].kind) && self.effective_enabled(*id))
            .collect::<Vec<_>>();
            if !overflow && self.nodes[&bar.command.more.unwrap()].visible {
                ids.push(bar.command.more.unwrap());
            }
            if !ids.is_empty() {
                let index = ids.iter().position(|i| *i == id).unwrap_or(0);
                let next = match key.as_str() {
                    "Home" => 0,
                    "End" => ids.len() - 1,
                    "ArrowLeft" | "ArrowUp" => (index + ids.len() - 1) % ids.len(),
                    _ => (index + 1) % ids.len(),
                };
                self.focus(Some(ids[next]));
            }
            return Ok(true);
        }
        Ok(false)
    }
}

impl Scene {
    pub(in crate::scene) fn command_tab_stops(&self) -> (HashSet<u32>, HashSet<u32>) {
        let mut managed = HashSet::new();
        let mut stops = HashSet::new();
        for bar in self
            .nodes
            .values()
            .filter(|n| n.kind == NodeKind::CommandBar)
        {
            for child in bar.command.primary.values().chain(bar.command.more.iter()) {
                if is_action(self.nodes[child].kind) || self.nodes[child].command.role == "more" {
                    managed.insert(*child);
                }
            }
            for overflow in [false, true] {
                let keys = if overflow {
                    &bar.command.overflow
                } else {
                    &bar.command.inline
                };
                let mut ids = keys
                    .iter()
                    .filter_map(|key| bar.command.primary.get(key).copied())
                    .filter(|id| {
                        is_action(self.nodes[id].kind)
                            && self.nodes[id].visible
                            && self.effective_enabled(*id)
                    })
                    .collect::<Vec<_>>();
                if !overflow {
                    if let Some(more) = bar
                        .command
                        .more
                        .filter(|id| self.nodes[id].visible && self.effective_enabled(*id))
                    {
                        ids.push(more);
                    }
                }
                if let Some(stop) = self
                    .focused
                    .filter(|id| ids.contains(id))
                    .or_else(|| ids.first().copied())
                {
                    stops.insert(stop);
                }
            }
        }
        (managed, stops)
    }
}

impl Scene {
    pub(in crate::scene) fn command_first_overflow(&self, popup: u32) -> Option<u32> {
        let owner = self.nodes.get(&popup)?.command.owner?;
        let bar = self.nodes.get(&owner)?;
        bar.command
            .overflow
            .iter()
            .filter_map(|key| bar.command.primary.get(key).copied())
            .find(|id| {
                is_action(self.nodes[id].kind)
                    && self.nodes[id].props.visible
                    && self.effective_enabled(*id)
            })
    }
}
