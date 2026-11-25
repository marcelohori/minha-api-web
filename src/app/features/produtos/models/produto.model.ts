export interface Produto {
  id: number;
  nome: string;
  preco: number;
  criadoEm: string;
}

export interface SalvarProdutoRequest {
  nome: string;
  preco: number;
}
