import { HttpClient } from "@angular/common/http";
import { Inject } from "@angular/core";
import { Observable } from "rxjs";

@Inject({
  providedIn: 'root'
})
export class AvaliacaoService {
  constructor(private http: HttpClient) {}
  private baseURL = 'http://localhost:3000/api';
  hasAvaliacao(viagemId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseURL}/avaliacao/hasAvaliacao/${viagemId}`)
  }
}
