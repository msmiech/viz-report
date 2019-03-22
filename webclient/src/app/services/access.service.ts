import {Injectable} from '@angular/core';
import {Headers, Http} from '@angular/http';
import {CanActivate, Router} from '@angular/router';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';


@Injectable()
export class AccessService implements CanActivate {

    private token_name = "access-token";
    private _serverProtocol: string = "http"; //default is "http" but can also be "https"
    private _serverIp: string = "localhost"; //default is localhost
    private _serverPort: number = 8081; //default is 8081
    private loginURL = "/login";
    private logoutURL = "/logout";
    private statusURl = "/status";
    private token: string = null;

    server_start: Date = new Date;
    failed_logins: number = 0;

    constructor(private http: Http, private router: Router) {

    }


    get serverProtocol(): string {
        return this._serverProtocol;
    }

    set serverProtocol(value: string) {
        this._serverProtocol = value;
    }

    get serverIp(): string {
        return this._serverIp;
    }

    set serverIp(value: string) {
        this._serverIp = value;
    }

    get serverPort(): number {
        return this._serverPort;
    }

    set serverPort(value: number) {
        this._serverPort = value;
    }

    /**
     * Angular guard activation method
     * @returns {boolean}
     */
    canActivate() {
        this.readToken();
        if (this.token != null) {
            return true;
        } else {
            this.router.navigate(['/login']);
            return false;
        }
    }

    /**
     * Reads token from local storage and saves it to this.token
     */
    readToken() {
        let token = localStorage.getItem(this.token_name);
        if (token) {
            this.token = token;
        }
    }

    /**
     * Writes JWT to local storage
     */
    writeToken() {
        localStorage.setItem(this.token_name, this.token);
    }

    /**
     * Removes JWT from local storage
     */
    removeToken() {
        localStorage.removeItem(this.token_name);
    }


    /**
     * Builds a complete URL path with current server access config
     * @param {string} path Path after protocol, IP, port; e.g. "/index"
     * @returns {string} Complete URL
     */
    buildUrl(path: string) {
        return this.serverProtocol + "://" + this.serverIp + ":" + this.serverPort + path;
    }

    /**
     * Performs login using given credentials
     * @param username
     * @param password
     * @returns {Promise<TResult|boolean>|Promise<TResult2|boolean>|Promise<boolean>}
     */
    doLogin(username: string, password: string): Promise<boolean> {
        return this.http.post(this.buildUrl(this.loginURL),
            {"username": username, "password": password}).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                this.token = res["token"];
                this.writeToken();

                this.getServerStatus();

                return true;
            }
            return false;
        });
    }

    /**
     * Creates an HTTP header containing the auth token
     * @returns {any}
     */
    getTokenHeader(): Headers {

        if (this.token == null) {
            return null;
        }
        let header = new Headers();
        header.append(this.token_name, this.token);
        return header;
    }

    /**
     * Performs log-out for currently logged in user
     * @returns {Promise<TResult|boolean>|Promise<TResult2|boolean>|Promise<boolean>}
     */
    doLogout(): Promise<boolean> {
        return this.http.post(this.buildUrl(this.logoutURL),
            {}, {headers: this.getTokenHeader()}).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                this.removeToken();
                return true;
            }
            return false;
        });
    }

    /**
     * Reads server state (start date, failed login count)
     */
    getServerStatus(): void {
        this.http.get(this.buildUrl(this.statusURl),
            {headers: this.getTokenHeader()}).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                this.server_start = res["date"] as Date;
                this.failed_logins = res["failed"] as number;
            }
        });
    }


}
