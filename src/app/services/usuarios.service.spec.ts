import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UsuariosService } from './usuarios.service';  

describe('UsuariosService', () => {
  let service: UsuariosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [provideHttpClientTesting],  
      providers: [UsuariosService],       
    });
    service = TestBed.inject(UsuariosService);  
    httpMock = TestBed.inject(HttpTestingController);  
  });

  it('should be created', () => {
    expect(service).toBeTruthy();  
  });

  it('should fetch users data', () => {
    const dummyUsuarios = [
      { id: 1, nome: 'Breno', distancia: '0.5', saida: '18:30', volta: '22:40', custo: '50', imagem: '/assets/breno.jpeg' },
      { id: 2, nome: 'Wendel', distancia: '1.0', saida: '18:10', volta: '22:40', custo: '25', imagem: '/assets/wendel.jpeg' },
    ];

    service.getUsuarios().subscribe((usuarios) => {
      expect(usuarios.length).toBe(2);
      expect(usuarios).toEqual(dummyUsuarios);
    });

    const req = httpMock.expectOne('http://localhost:3001/usuarios');
    expect(req.request.method).toBe('GET');  
    req.flush(dummyUsuarios);  

    httpMock.verify();  
  });

  afterEach(() => {
    httpMock.verify();
  });
});
