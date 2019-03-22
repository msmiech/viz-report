import {Component, OnInit} from '@angular/core';
import {AccessService} from "../services/access.service";
import {Http} from '@angular/http';
import 'rxjs/add/operator/toPromise';
import {NgForm} from '@angular/forms';


@Component({
  selector: 'my-options',
  templateUrl: '../views/options.html'
})
export class OptionsComponent implements OnInit {

  updateError: boolean;
  error_message: string;
  updatePasswordURL = "http://localhost:8081/updatePW";

  constructor(private accessService: AccessService, private http: Http) {
  };

  ngOnInit(): void {
    this.updateError = false;
  }

  public equalsPW(form: NgForm): boolean {
    if(!form || !form.value || !form.value["repeat-password"] || !form.value["new-password"]){
      return false;
    }
    return form.value["repeat-password"] === form.value["new-password"];
  }

  onSubmit(form: NgForm): void {

    this.updateError = false;

    if (!form || !form.value || !form.value["new-password"] || !form.value["repeat-password"] || !form.value["old-password"]) {
      this.error_message = "Es wurden nicht alle benötigten Eingaben getätigt!";
      this.updateError = true;
      return;
    }


    var data = {
      old_password: form.value["old-password"],
      new_password: form.value["new-password"],
      repeat_password: form.value["repeat-password"]
    };


    this.http.post(this.updatePasswordURL, {
      old_password: form.value["old-password"],
      new_password: form.value["new-password"],
      repeat_password: form.value["repeat-password"]
    }, {headers: this.accessService.getTokenHeader()})
      .toPromise()
      .then(response => {
        response = response.json();
        console.log(response);
        if (response.status == 200) {
          form.reset();
          return;
        }

        switch (response["errorNum"]) {
          case 0:
            this.error_message = "Das alte Passwort ist nicht korrekt!";
            this.updateError = true;
            break;
          case 1:
            this.error_message = "Passwörter stimmen nicht überein!";
            this.updateError = true;
            break;
          case 2:
            this.error_message = "Das Passwort konnte nicht gespeichert werden!";
            this.updateError = true;
            break;
        }
        return;
      });

  }

}
