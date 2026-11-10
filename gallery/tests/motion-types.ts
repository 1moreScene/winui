import {AnimatedProperty,ConnectedAnimationConfiguration,ExpressionProperty,ScalarExpression,ThemeTransition,ThemeMode,type SceneNode} from 'winui-wasm';
function publicMotionTypes(node:SceneNode){
  node.update({motion:{implicit:{[AnimatedProperty.Opacity]:300},transitions:[ThemeTransition.Entrance],hoverSpring:{period:50,dampingRatio:0.6}}});
  node.bindExpressions({[AnimatedProperty.ScaleX]:ScalarExpression.constant(1).divide(ScalarExpression.reference(node,ExpressionProperty.ScaleX))});
  const connection=node.prepareConnectedAnimation('image');connection.tryStart(node,ConnectedAnimationConfiguration.Basic);connection.cancel();
  connection.tryStart(node,ConnectedAnimationConfiguration.Gravity,[node]);
  // @ts-expect-error finite transition choices require runtime enum members
  node.update({motion:{transitions:['Entrance']}});
  // @ts-expect-error unknown implicit property
  node.update({motion:{implicit:{width:300}}});
  // @ts-expect-error reference properties require the exported enum
  ScalarExpression.reference(node,'scaleX');
  // @ts-expect-error incompatible enum
  connection.tryStart(node,ThemeMode.Dark);
}
void publicMotionTypes;
