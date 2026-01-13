export * as Periphery from './periphery/index.js';
export * as Core from './core/index.js';

// Quick access to most commonly used contracts
export { default as UniswapV2Router02 } from './periphery/UniswapV2Router02.json';
export { default as IUniswapV2Router02 } from './periphery/IUniswapV2Router02.json';
export { default as UniswapV2Factory } from './core/UniswapV2Factory.json';
export { default as IUniswapV2Factory } from './core/IUniswapV2Factory.json';
export { default as IUniswapV2Pair } from './core/IUniswapV2Pair.json';
export { default as IERC20 } from './periphery/IERC20.json';
export { default as IWETH } from './periphery/IWETH.json';
