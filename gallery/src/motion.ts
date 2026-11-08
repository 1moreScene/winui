import {ExpressionOperation,ExpressionProperty,AnimatedProperty,ThemeTransition} from './enums';
import type {SceneNode} from './scene';

/** Natural spring parameters, solved in Rust with velocity-preserving retargeting. */
export interface SpringOptions {
  /** Oscillation period in ms, 1..10000. Default 50. */ period?:number;
  /** Damping ratio, 0.01..1; 1 is critically damped. Default 0.6. */ dampingRatio?:number;
}
/** Declarative motion configuration, shared by imperative and React SDK nodes. */
export interface MotionOptions {
  /** Property change durations in ms. Omitted channels update immediately. */ implicit?:Partial<Record<AnimatedProperty,number>>;
  /** Solid/resource background crossfade duration in ms. Default disabled; native BrushTransition default 150. */ backgroundDuration?:number|null;
  /** Layout transitions for this node. Default empty. */ transitions?:readonly ThemeTransition[];
  /** Layout transitions applied to direct children. Default empty. */ childrenTransitions?:readonly ThemeTransition[];
  /** Disable Entrance staggering. Default false. */ disableStagger?:boolean;
  /** Rust handles pointer hit testing and hover scale; default disabled. */ hoverSpring?:(SpringOptions&{/** Hover scale. Default 1.5; normal scale 1. */scale?:number})|null;
}
type Operand=ScalarExpression|number;
type Tree={kind:'constant';value:number}|{kind:'reference';node:SceneNode;property:ExpressionProperty}|{kind:'binary';operation:ExpressionOperation;left:ScalarExpression;right:ScalarExpression}|{kind:'sin'|'cos';value:ScalarExpression};
/** Typed Composition scalar expression. Rust evaluates bindings after layout in dependency order. */
export class ScalarExpression {
  private constructor(private readonly tree:Tree){}
  /** A finite constant. */ static constant(value:number){return new ScalarExpression({kind:'constant',value});}
  /** Read a source's current presentation or arranged geometry, without JS polling. */
  static reference(node:SceneNode,property:ExpressionProperty){return new ScalarExpression({kind:'reference',node,property});}
  private static operand(value:Operand){return typeof value==='number'?this.constant(value):value;}
  private binary(operation:ExpressionOperation,right:Operand){return new ScalarExpression({kind:'binary',operation,left:this,right:ScalarExpression.operand(right)});}
  /** Add a scalar expression or constant. */ add(value:Operand){return this.binary(ExpressionOperation.Add,value);}
  /** Subtract a scalar expression or constant. */ subtract(value:Operand){return this.binary(ExpressionOperation.Subtract,value);}
  /** Multiply by a scalar expression or constant. */ multiply(value:Operand){return this.binary(ExpressionOperation.Multiply,value);}
  /** Divide. A nonfinite evaluation retains the previous presentation for that frame. */ divide(value:Operand){return this.binary(ExpressionOperation.Divide,value);}
  /** Remainder. A nonfinite evaluation retains the previous presentation for that frame. */ modulo(value:Operand){return this.binary(ExpressionOperation.Modulo,value);}
  /** Sine of an angle in radians. */ sin(){return new ScalarExpression({kind:'sin',value:this});}
  /** Cosine of an angle in radians. */ cos(){return new ScalarExpression({kind:'cos',value:this});}
  /** @internal Encodes stable handles only after checking scene ownership. */
  toWire(resolve:(node:SceneNode)=>number):unknown {
    const tree=this.tree;
    if(tree.kind==='reference')return {...tree,node:resolve(tree.node)};
    if(tree.kind==='binary')return {...tree,left:tree.left.toWire(resolve),right:tree.right.toWire(resolve)};
    if(tree.kind==='sin'||tree.kind==='cos')return {...tree,value:tree.value.toWire(resolve)};
    return tree;
  }
}
/** Targets are closed enum channels; a binding replaces previous bindings on that node. */
export type ExpressionBindings=Partial<Record<AnimatedProperty,ScalarExpression>>;
