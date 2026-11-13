import { createElement, useRef, useState, type ComponentType } from 'react';
import * as Native from 'winui-wasm/react';
import { controlSpec, isElement, type ElementSpec } from './control-spec';
import type { DesignNode } from './model';

interface BoundController { showAsync?: () => Promise<unknown>; navigate?: (page: string) => unknown }
/** The only dynamic boundary: declarations are built by controlSpec, never by
 * imported code. SDK props still go through the public React adapter unchanged. */
export function DesignedControl({ node, layer }: { node: DesignNode; layer: number }) {
  const controllers = useRef<Record<string, BoundController>>({});
  const [states, setStates] = useState<Record<string, boolean>>({});
  function resolve(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (isElement(value)) return render(value);
    if (Array.isArray(value)) return value.map(resolve);
    const data = value as Record<string, unknown>;
    if ('$enum' in data) return data.value;
    if ('$state' in data) return states[String(data.$state)] ?? false;
    if ('$bind' in data) return (control: BoundController) => { controllers.current[String(data.$bind)] = control; };
    if ('$call' in data) return () => { const control = controllers.current[String(data.$call)]; if (data.method === 'showAsync') void control?.showAsync?.(); };
    if ('$toggle' in data) return () => setStates(current => ({ ...current, [String(data.$toggle)]: !current[String(data.$toggle)] }));
    if ('$set' in data) return () => setStates(current => ({ ...current, [String(data.$set)]: Boolean(data.value) }));
    if ('$init' in data) return (control: BoundController) => { if (data.$init === 'navigate') control.navigate?.(String(data.argument)); };
    return Object.fromEntries(Object.entries(data).map(([key, child]) => [key, resolve(child)]));
  }
  function render(spec: ElementSpec, key = 'root'): React.ReactNode {
    const [name, property] = spec.component.split('.');
    const component = (Native as unknown as Record<string, unknown>)[name];
    const target = property ? (component as Record<string, unknown>)[property] : component;
    if (typeof target !== 'function') throw new Error(`Missing public SDK adapter: ${spec.component}`);
    return createElement(target as ComponentType<Record<string, unknown>>, { key, ...Object.fromEntries(Object.entries(spec.props).map(([name,value]) => [name, resolve(value)])) },
      ...spec.children.map((child, index) => render(child, `${key}-${index}`)));
  }
  return controlSpec(node, layer).map((spec, index) => render(spec, String(index)));
}
