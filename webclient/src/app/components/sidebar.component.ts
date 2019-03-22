import {Component, OnInit} from "@angular/core";
import {AccessService} from "../services/access.service";

@Component({
  selector: 'nav-sidebar',
  templateUrl: '../views/sidebar.component.html'
})
export class SidebarComponent implements OnInit{


  constructor(private accessService: AccessService){}

  ngOnInit(): void {
    this.accessService.getServerStatus();
  }
}
