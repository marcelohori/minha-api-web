import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Produto, SalvarProdutoRequest } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-produto-crud',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div style="max-width: 800px; margin: 2rem auto; font-family: sans-serif;">
      <h2>Gerenciamento de Produtos</h2>

      @if (erro()) {
        <div style="background: #fee2e2; color: #b91c1c; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
          {{ erro() }}
        </div>
      }

      <!-- Formulário -->
      <form [formGroup]="form" (ngSubmit)="salvar()" style="display: flex; gap: 1rem; margin-bottom: 2rem;">
        <input formControlName="nome" placeholder="Nome do produto" style="flex: 2; padding: 0.5rem;" />
        <input formControlName="preco" type="number" step="0.01" placeholder="Preço" style="flex: 1; padding: 0.5rem;" />
        
        <button type="submit" [disabled]="form.invalid || carregando()" style="padding: 0.5rem 1rem;">
          {{ editandoId() ? 'Atualizar' : 'Adicionar' }}
        </button>

        @if (editandoId()) {
          <button type="button" (click)="cancelarEdicao()">Cancelar</button>
        }
      </form>

      <!-- Tabela -->
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th>ID</th>
            <th>Nome</th>
            <th>Preço</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (item of produtos(); track item.id) {
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td>{{ item.id }}</td>
              <td>{{ item.nome }}</td>
              <td>{{ item.preco | currency:'BRL' }}</td>
              <td>{{ item.criadoEm | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <button (click)="editar(item)" style="margin-right: 0.5rem;">Editar</button>
                <button (click)="excluir(item.id)">Excluir</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" style="padding: 1rem 0;">Nenhum produto cadastrado.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class ProdutoCrudComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProdutoService);

  produtos = signal<Produto[]>([]);
  editandoId = signal<number | null>(null);
  carregando = signal(false);
  erro = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    preco: [0, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.carregando.set(true);
    this.service.listar().subscribe({
      next: (dados) => {
        this.produtos.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Erro ao carregar produtos.');
        this.carregando.set(false);
      }
    });
  }

  salvar(): void {
    if (this.form.invalid) return;
    this.erro.set(null);
    const payload: SalvarProdutoRequest = this.form.getRawValue();
    const id = this.editandoId();

    const sucesso = () => {
      this.cancelarEdicao();
      this.carregarProdutos();
    };
    const falha = (err: any) => {
      // Captura erros de validação (ProblemDetails) vindos do .NET/BFF
      const detalhes = err.error?.errors;
      this.erro.set(detalhes ? Object.values(detalhes).flat().join(' ') : 'Erro ao salvar produto.');
    };

    if (id !== null) {
      this.service.atualizar(id, payload).subscribe({
        next: sucesso,
        error: falha
      });
    } else {
      this.service.criar(payload).subscribe({
        next: sucesso,
        error: falha
      });
    }
  }

  editar(produto: Produto): void {
    this.editandoId.set(produto.id);
    this.form.patchValue({ nome: produto.nome, preco: produto.preco });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.form.reset({ nome: '', preco: 0 });
  }

  excluir(id: number): void {
    this.service.remover(id).subscribe({
      next: () => this.carregarProdutos(),
      error: () => this.erro.set('Erro ao excluir produto.')
    });
  }
}
