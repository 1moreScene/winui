import { NodeKind, PasswordRevealMode, FontStyle } from "./enums";
import type { NodeSnapshot } from "./scene";
let nextRichEditorId = 0;
interface Bridge {
  richClipboard(node:NodeSnapshot):{document:import("./rich-edit-types").RichEditDocument;rtf?:string;text:string};
  key(node:NodeSnapshot,event:KeyboardEvent,up:boolean):boolean;
  pointer(node:NodeSnapshot):void;
  send(input: object): void;
  flush(): void;
  point(node: NodeSnapshot, event: PointerEvent): { x: number; y: number };
}
/** Browser editing/IME/clipboard bridge. Rust owns value, selection, history,
 * layout, selection paint and caret. The native editor's glyphs are transparent. */
export class EditorHost {
  readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly helper = document.createElement("button");
  private scrollbars: HTMLElement[] = [];
  private abort = new AbortController();
  private composing = false;
  private cancelledComposition = false;
  private dragging = false;
  private node: NodeSnapshot;
  private parentAbort = () => this.dispose();
  constructor(
    node: NodeSnapshot,
    private parent: HTMLElement,
    private parentSignal: AbortSignal,
    private bridge: Bridge,
  ) {
    this.node = node;
    this.input =
      (node.kind === NodeKind.TextBox || node.kind === NodeKind.RichEditBox) &&
      (node.props.wrap || node.props.acceptsReturn)
        ? document.createElement("textarea")
        : document.createElement("input");
    this.input.className = "winui-editor";
    this.input.dataset.editor = String(node.id);
    this.input.setAttribute("role", "textbox");
    this.input.autocomplete = "off";
    this.helper.type = "button";
    this.helper.tabIndex = -1;
    this.helper.className = "winui-editor-helper";
    parent.prepend(this.input, this.helper);
    parentSignal.addEventListener("abort", this.parentAbort, { once: true });
    const signal = this.abort.signal,
      area = this.input,
      target = this.input as HTMLElement;
    const selection = () => {
      if (document.activeElement === area && !this.composing)
        this.bridge.send({
          kind: "select",
          id: node.id,
          start: area.selectionStart ?? 0,
          length: (area.selectionEnd ?? 0) - (area.selectionStart ?? 0),
          backward: area.selectionDirection === "backward",
        });
    };
    target.addEventListener(
      "focus",
      () => {
        this.bridge.send({ kind: "focus", id: node.id });
        this.bridge.flush();
      },
      { signal },
    );
    target.addEventListener("select", selection, { signal });
    document.addEventListener("selectionchange", selection, { signal });
    target.addEventListener(
      "keyup",
      (e) => {
        e.stopPropagation();
        if(!this.composing)this.bridge.key(this.node,e,true);
        selection();
      },
      { signal },
    );
    target.addEventListener(
      "keydown",
      (e) => {
        e.stopPropagation();
        if (this.composing) return;
        if(this.bridge.key(this.node,e,false)){e.preventDefault();return;}
        if (node.kind===NodeKind.RichEditBox && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key)) {
          e.preventDefault();this.bridge.send({kind:'richEdit',id:node.id,command:{action:'navigate',key:e.key,extend:e.shiftKey,control:e.ctrlKey||e.metaKey}});this.bridge.flush();return;
        }
        if (node.kind === NodeKind.RichEditBox && (e.ctrlKey||e.metaKey) && ['b','i','u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          this.bridge.send({kind:'richEdit',id:node.id,command:{action:({b:'toggleBold',i:'toggleItalic',u:'toggleUnderline'} as Record<string,string>)[e.key.toLowerCase()]}});
          return;
        }
        if (e.key === "Enter" && !this.node.props.acceptsReturn)
          e.preventDefault();
        if (
          (e.ctrlKey || e.metaKey) &&
          ["z", "y"].includes(e.key.toLowerCase())
        ) {
          e.preventDefault();
          this.bridge.send({
            kind: "editCommand",
            id: node.id,
            command:
              e.key.toLowerCase() === "y" || e.shiftKey ? "redo" : "undo",
          });
        }
      },
      { signal },
    );
    if(node.kind===NodeKind.RichEditBox){
      area.id = `winui-rich-editor-${++nextRichEditorId}`;
      for (const axis of ['horizontal', 'vertical']) {
        const bar = document.createElement('div');
        bar.setAttribute('role', 'scrollbar');
        bar.setAttribute('aria-orientation', axis);
        bar.setAttribute('aria-controls', area.id);
        bar.setAttribute('aria-label', `${axis} scroll`);
        bar.setAttribute('aria-valuemin', '0');
        this.scrollbars.push(bar);
        parent.append(bar);
      }
      for(const type of ['copy','cut'] as const)target.addEventListener(type,event=>{
        if(!event.clipboardData)return;
        const data=this.bridge.richClipboard(this.node);if(!data.document.runs.length)return;event.preventDefault();
        event.clipboardData.setData('text/plain',data.text);
        event.clipboardData.setData('application/x-winui-rich-document+json',JSON.stringify(data.document));
        if(data.rtf)event.clipboardData.setData('text/rtf',data.rtf);
        if(type==='cut'&&!this.node.props.isReadOnly){this.bridge.send({kind:'richEdit',id:node.id,command:{action:'replace',text:''}});this.bridge.flush();}
      },{signal});
      target.addEventListener('paste',event=>{
        const clipboard=event.clipboardData;if(!clipboard||this.node.props.isReadOnly)return;
        const document=clipboard.getData('application/x-winui-rich-document+json'),rtf=clipboard.getData('text/rtf');
        if(document||rtf){event.preventDefault();this.bridge.send({kind:'richEdit',id:node.id,command:document?{action:'replaceDocument',document:JSON.parse(document)}:{action:'insertRtf',rtf}});this.bridge.flush();return;}
        const image=Array.from(clipboard.files).find(f=>f.type==='image/png'||f.type==='image/jpeg');
        if(image){event.preventDefault();const reader=new FileReader(),generation=this.node.editor!.generation;
          reader.onload=()=>{if(!signal.aborted&&generation===this.node.editor!.generation){this.bridge.send({kind:'richEdit',id:node.id,command:{action:'insertImage',generation,image:{source:String(reader.result),altText:image.name}}});this.bridge.flush();}};
          reader.readAsDataURL(image);
        }
      },{signal});
    }
    target.addEventListener(
      "beforeinput",
      (e) => {
        const event = e as InputEvent;
        if (
          event.inputType === "historyUndo" ||
          event.inputType === "historyRedo"
        ) {
          event.preventDefault();
          this.bridge.send({
            kind: "editCommand",
            id: node.id,
            command: event.inputType === "historyUndo" ? "undo" : "redo",
          });
        }
      },
      { signal },
    );
    const composition = (active: boolean) =>
      this.bridge.send({
        kind: "editComposition",
        id: node.id,
        text: area.value,
        active,
        start: area.selectionStart ?? 0,
        length: (area.selectionEnd ?? 0) - (area.selectionStart ?? 0),
      });
    target.addEventListener(
      "compositionstart",
      () => {
        this.cancelledComposition = false;
        this.composing = true;
        composition(true);
      },
      { signal },
    );
    target.addEventListener(
      "compositionend",
      () => {
        this.composing = false;
        if (!this.cancelledComposition) composition(false);
        else this.update(this.node);
        this.cancelledComposition = false;
      },
      { signal },
    );
    target.addEventListener(
      "input",
      (e) => {
        if (this.cancelledComposition) return;
        if ((e as InputEvent).isComposing || this.composing) composition(true);
        else
          this.bridge.send({
            kind: "edit",
            id: node.id,
            text: area.value,
            start: area.selectionStart ?? 0,
            length: (area.selectionEnd ?? 0) - (area.selectionStart ?? 0),
            inputType: (e as InputEvent).inputType || "insertText",
          });
      },
      { signal },
    );
    target.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "touch" && area.closest("[data-scroll-viewer]"))
          return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        area.focus({ preventScroll: true });
        this.dragging = true;
        area.setPointerCapture(e.pointerId);
        this.bridge.send({
          kind: "editPointer",
          id: node.id,
          ...this.bridge.point(this.node, e),
          extend: e.shiftKey,
          word: e.detail === 2,
        });
        this.bridge.flush();
      },
      { signal },
    );
    target.addEventListener(
      "pointermove",
      (e) => {
        if (!this.dragging) return;
        e.preventDefault();
        e.stopPropagation();
        this.bridge.send({
          kind: "editPointer",
          id: node.id,
          ...this.bridge.point(this.node, e),
          extend: true,
          word: false,
        });
      },
      { signal },
    );
    for (const type of ["pointerup", "pointercancel"] as const)
      target.addEventListener(
        type,
        (e) => {
          if(type==="pointerup")this.bridge.pointer(this.node);
          if (this.dragging) {
            this.dragging = false;
            e.stopPropagation();
            if (area.hasPointerCapture(e.pointerId))
              area.releasePointerCapture(e.pointerId);
          }
        },
        { signal },
      );
    if (node.kind === NodeKind.PasswordBox)
      for (const type of ["copy", "cut"] as const)
        target.addEventListener(type, (e) => e.preventDefault(), { signal });
    for (const [type, command] of [
      ["pointerenter", "helperEnter"],
      ["pointerleave", "helperLeave"],
      ["pointerdown", "helperDown"],
      ["pointerup", "helperUp"],
    ] as const)
      this.helper.addEventListener(
        type,
        () => this.bridge.send({ kind: "editCommand", id: node.id, command }),
        { signal },
      );
    this.helper.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.focus({ preventScroll: true });
        if (node.kind === NodeKind.PasswordBox) {
          this.helper.setPointerCapture(e.pointerId);
          this.bridge.send({
            kind: "editCommand",
            id: node.id,
            command: "revealStart",
          });
        }
      },
      { signal },
    );
    for (const type of [
      "pointerup",
      "pointercancel",
      "lostpointercapture",
    ] as const)
      this.helper.addEventListener(
        type,
        (e) => {
          e.stopPropagation();
          if (node.kind === NodeKind.PasswordBox)
            this.bridge.send({
              kind: "editCommand",
              id: node.id,
              command: "revealEnd",
            });
        },
        { signal },
      );
    this.helper.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        if (node.kind === NodeKind.TextBox)
          this.bridge.send({
            kind: "editCommand",
            id: node.id,
            command: "clear",
          });
      },
      { signal },
    );
  }
  matches(node: NodeSnapshot) {
    return (
      this.input instanceof HTMLTextAreaElement ===
      ((node.kind === NodeKind.TextBox || node.kind === NodeKind.RichEditBox) &&
        !!(node.props.wrap || node.props.acceptsReturn))
    );
  }
  update(node: NodeSnapshot) {
    const previous = this.node;
    if (
      this.composing &&
      (node.editor!.generation !== this.node.editor!.generation ||
        !node.enabled ||
        node.props.isReadOnly)
    ) {
      this.composing = false;
      this.cancelledComposition = true;
    }
    this.node = node;
    const p = node.props,
      e = node.editor!;
    const area = this.input;
    const r = e.view;
    area.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;margin:0;padding:0;border:0;outline:0;box-shadow:none;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:transparent;resize:none;overflow:hidden;pointer-events:auto;box-sizing:border-box;font:${(p.fontStyle ?? FontStyle.Normal).toLowerCase()} ${p.fontWeight} ${p.fontSize}px ${p.fontFamily};line-height:${e.caret.height}px;letter-spacing:${((p.characterSpacing ?? 0) * (p.fontSize ?? 14)) / 1000}px;`;
    area.style.cursor = node.pointer.editorCursor;
    area.style.userSelect = node.pointer.editorTextSelection;
    if (area instanceof HTMLInputElement)
      area.type =
        node.kind === NodeKind.PasswordBox &&
        p.passwordRevealMode !== PasswordRevealMode.Visible &&
        !e.revealed
          ? "password"
          : "text";
    else area.wrap = p.wrap ? "soft" : "off";
    area.disabled = !node.enabled;
    area.readOnly = !!p.isReadOnly;
    area.spellcheck = (node.kind === NodeKind.TextBox || node.kind === NodeKind.RichEditBox) && !!p.isSpellCheckEnabled;
    area.tabIndex = node.tabStop ? 0 : -1;
    if (p.maxLength) area.maxLength = p.maxLength;
    else area.removeAttribute("maxlength");
    area.setAttribute(
      "aria-label",
      p.accessibleName ??
        (p.header ||
          p.placeholderText ||
          node.kind),
    );
    if(node.kind===NodeKind.RichEditBox){
      const objects=p.document?.runs.filter(r=>r.image||r.mathml).map(r=>r.image?`Image: ${r.image.altText||'embedded image'}`:'Math formula')??[];
      if(objects.length)area.setAttribute('aria-description',objects.join('; '));else area.removeAttribute('aria-description');
    }
    area.setAttribute("aria-multiline", String(!!p.acceptsReturn));
    area.setAttribute("aria-readonly", String(!!p.isReadOnly));
    const value =
      node.kind === NodeKind.PasswordBox ? (p.password ?? "") : (p.text ?? "");
    const valueChanged = !this.composing && area.value !== value;
    if (valueChanged) area.value = value;
    // A browser selection can lead its asynchronous select/selectionchange
    // event (notably WebKit's native text insertion). Reapplying an unchanged
    // Rust selection each frame would undo that selection before beforeinput.
    const selectionChanged =
      previous.props.selectionStart !== p.selectionStart ||
      previous.props.selectionLength !== p.selectionLength ||
      previous.editor?.backward !== e.backward ||
      previous.editor?.generation !== e.generation;
    if (
      !this.composing &&
      (valueChanged || selectionChanged) &&
      (area.selectionStart !== p.selectionStart ||
        area.selectionEnd !==
          (p.selectionStart ?? 0) + (p.selectionLength ?? 0))
    )
      area.setSelectionRange(
        p.selectionStart ?? 0,
        (p.selectionStart ?? 0) + (p.selectionLength ?? 0),
        e.backward ? "backward" : "forward",
      );
    area.scrollLeft = e.scrollX;
    area.scrollTop = e.scrollY;
    this.scrollbars.forEach((bar, index) => {
      const vertical = index === 1;
      const view = node.scroll;
      const bounds = vertical ? view?.verticalBar : view?.horizontalBar;
      bar.hidden = !bounds;
      if (!bounds || !view) return;
      bar.style.cssText = `position:absolute;left:${r.x + bounds.x}px;top:${r.y + bounds.y}px;width:${bounds.width}px;height:${bounds.height}px;pointer-events:${node.enabled ? 'auto' : 'none'};touch-action:none`;
      bar.setAttribute('aria-valuemax', String(vertical ? view.scrollableHeight : view.scrollableWidth));
      bar.setAttribute('aria-valuenow', String(vertical ? view.verticalOffset : view.horizontalOffset));
      bar.setAttribute('aria-disabled', String(!node.enabled));
    });
    const button = e.helperButton;
    this.helper.style.cssText = `position:absolute;left:${button?.x ?? 0}px;top:${button?.y ?? 0}px;width:${button?.width ?? 0}px;height:${button?.height ?? 0}px;padding:0;border:0;background:transparent;opacity:0;pointer-events:auto;display:${button ? "block" : "none"}`;
    this.helper.style.cursor = node.pointer.cursor;
    this.helper.style.userSelect = node.pointer.textSelection;
    this.helper.setAttribute(
      "aria-label",
      node.kind === NodeKind.PasswordBox ? "Reveal password"
        : (node.props as {editorClearSelection?:boolean}).editorClearSelection ? "Clear selection" : "Clear text",
    );
  }
  dispose() {
    this.parentSignal.removeEventListener("abort", this.parentAbort);
    this.abort.abort();
    this.input.value = "";
    this.input.remove();
    this.helper.remove();
    this.scrollbars.forEach(bar => bar.remove());
  }
}
