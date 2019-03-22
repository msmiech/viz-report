import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AccessService} from '../services/access.service';
import {NgForm} from '@angular/forms';

@Component({
    selector: 'my-login',
    templateUrl: '../views/login.html'
})
export class LoginComponent {

    //template accessible fields
    loginError: boolean = false;
    accessService: AccessService;

    constructor(private router: Router, accessService: AccessService) { //DI
        this.accessService = accessService;
    }

    onSubmit(form: NgForm): void {

        if (!form || !form.value || !form.value["username"] || !form.value["password"]) {
            this.loginError = true;
        }

        this.accessService.doLogin(form.value["username"], form.value["password"]).then(successfully => {
            this.loginError = !successfully;
            if (successfully) {
                this.router.navigate(['/statistics']);
            }
        });

    }
}
