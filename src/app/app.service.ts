import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  public _url = 'http://localhost:6999/tampar-api';

  constructor(private _httpClient: HttpClient) { }

  private _getService: BehaviorSubject<any | null> = new BehaviorSubject(null);
  private _processService: BehaviorSubject<any | null> = new BehaviorSubject(
    null
  );
  /* HEADERS */
  header: Object = {
    headers: new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'No-Auth': 'True',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      // 'Access-Control-Allow-Origin': this.url,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Header':
        'Origin, Content-Type, X-Auth-Token, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
      'Strict-Transport-Security': 'max-age=31536000; includeSubdomains',
      'Content-Security-Policy': "default-src 'self'",
      'Expect-CT': 'max-age=7776000, enforce',
      'X-XSS-Protection': '1; mode=block',
      'Set-Cookie': 'key=value; SameSite=Strict; httpOnly',
      'Referrer-Policy': 'same-origin',
    }),
  };

  hdr: Object = {
    headers: new HttpHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'No-Auth': 'True',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Access-Control-Allow-Origin': this._url,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Header':
        'Origin, Content-Type, X-Auth-Token, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, OPTIONS',
      'Strict-Transport-Security': 'max-age=31536000; includeSubdomains',
      'Content-Security-Policy': "default-src 'self'",
      'Expect-CT': 'max-age=7776000, enforce',
      'X-XSS-Protection': '1; mode=block',
      'Set-Cookie': 'key=value; SameSite=Strict; httpOnly',
      'Referrer-Policy': 'same-origin',
    }),
  };

  getDownloadFile(filename: string) {
    this.downloadURI(`${this._url}/common/downloadTemplate`, filename);
  }

  downloadURI(uri: string, name: string) {
    var link = document.createElement('a');
    link.download = name;
    link.href = uri;
    console.log(uri);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // process(criteria: any): Observable<any> {
  //   return this._httpClient
  //     .post(`${this._url}/common/process`, criteria, this.hdr)
  //     .pipe(
  //       switchMap((response: any) => {
  //         this._processService.next(response);
  //         return of(response);
  //       })
  //     );
  // }

  process(criteria: any): Observable<any> {
    return this._httpClient.post(`${this._url}/common/process`, criteria, {
      ...this.hdr,
      responseType: 'blob' as 'json',
    });
  }

  getSchema(): Observable<any> {
    return this._httpClient.post(`${this._url}/common/getSchema`, null, this.header);
  }
}
