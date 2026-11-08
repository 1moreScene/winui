import official from './official-repeater-refresh.json';
export const galleryData=official._repository.data;
/** CSS/Windows named-color values for the repository's ColorList. */
export const galleryColors:Record<string,string>={Blue:'#0000ff',BlueViolet:'#8a2be2',Crimson:'#dc143c',DarkCyan:'#008b8b',DarkGoldenrod:'#b8860b',DarkMagenta:'#8b008b',DarkOliveGreen:'#556b2f',DarkRed:'#8b0000',DarkSlateBlue:'#483d8b',DeepPink:'#ff1493',IndianRed:'#cd5c5c',MediumSlateBlue:'#7b68ee',Maroon:'#800000',MidnightBlue:'#191970',Peru:'#cd853f',SaddleBrown:'#8b4513',SteelBlue:'#4682b4',OrangeRed:'#ff4500',Firebrick:'#b22222',DarkKhaki:'#bdb76b'};
export interface Recipe {id:string;text:string;num:number;name:string;color:string;ingredients:string;ingredientList:string[];}
/** Business data generation mirrors GetRecipeList/RandomizeIngredients. Layout stays in Rust. */
export function createGalleryRecipes(random:()=>number=Math.random):Recipe[]{
 const pick=<T,>(values:readonly T[],exclusiveMax=values.length)=>values[Math.floor(random()*exclusiveMax)];
 return Array.from({length:galleryData.recipeCount},(_,num)=>{const ingredientList=galleryData.categories.map(c=>pick(c.items,6));for(let i=0;i<Math.floor(random()*4);i++){const extra=pick(galleryData.extras,6);if(!ingredientList.includes(extra))ingredientList.push(extra);}return{id:String(num),text:`Recipe ${num}`,num,name:`Recipe ${num}`,color:galleryColors[pick(galleryData.colors,19)],ingredients:'\n'+ingredientList.join('\n'),ingredientList};});
}
