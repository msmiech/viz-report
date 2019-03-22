import {Component} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router'
import {OptionsComponent} from "./options.component";
import {LoginComponent} from "./login.component";
import {AccessService} from "../services/access.service";

@Component({
  selector: 'topbar',
  templateUrl: '../views/topbar.component.html'
})
export class TopbarComponent {


  constructor(private router: Router, private route: ActivatedRoute, private accessService: AccessService) {
  };

  isOptionsShown(): boolean {
    return !this.isOptionsite() && !this.isLoginSite();
  }

  isLogoutShown(): boolean {
    return !this.isLoginSite();
  }


  isOptionsite(): boolean {
    return this.route.component === OptionsComponent;
  }


  isLoginSite(): boolean {
    return this.route.component === LoginComponent;
  }

  doLogout(): void {
    console.log("doLogout");
    this.accessService.doLogout().then(successfully => {
      if (successfully) {
        this.router.navigate(["/login"]);
      } else {
        window.alert("Sie konnten nicht abgemeldet werden.\nBitte versuchen Sie es erneut.");
      }
    });

  }

}
