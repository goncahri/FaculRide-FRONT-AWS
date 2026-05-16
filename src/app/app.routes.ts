import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { DevsComponent } from './devs/devs.component';
import { AjudaComponent } from './ajuda/ajuda.component';
import { LoginComponent } from './login/login.component';
import { UsuarioComponent } from './usuario/usuario.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'devs', component: DevsComponent },
  { path: 'ajuda', component: AjudaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'usuario', component: UsuarioComponent },
  { path: 'cadastro', loadComponent: () => import('./cadastro/cadastro.component').then(m => m.CadastroComponent) },
  { path: 'gerenciar', loadComponent: () => import('./gerenciar-conta/gerenciar.component').then(m => m.GerenciarComponent) }
];

