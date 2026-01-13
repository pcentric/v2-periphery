declare module '*/frontend-abis' {
  export interface ContractABI {
    contractName: string;
    abi: any[];
    bytecode?: string;
  }

  export namespace Periphery {
    export const UniswapV2Router02: ContractABI;
    export const IUniswapV2Router02: ContractABI;
    export const IERC20: ContractABI;
    export const IWETH: ContractABI;
    export const WETH9: ContractABI;
  }

  export namespace Core {
    export const UniswapV2Factory: ContractABI;
    export const UniswapV2Pair: ContractABI;
    export const IUniswapV2Factory: ContractABI;
    export const IUniswapV2Pair: ContractABI;
  }

  export const UniswapV2Router02: ContractABI;
  export const IUniswapV2Router02: ContractABI;
  export const UniswapV2Factory: ContractABI;
  export const IUniswapV2Factory: ContractABI;
  export const IUniswapV2Pair: ContractABI;
  export const IERC20: ContractABI;
  export const IWETH: ContractABI;
}
