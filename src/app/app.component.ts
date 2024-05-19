import {Component, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ChatPopupComponent} from "./pop-ups/chat-popup/chat-popup.component";
import {TwilioService} from "./shared/services/twilio.service";
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatPopupComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'twilio-chatbox';
  viewChatPopup = false;
  twilioToken = '';
  isAdmin= true;


  userToggle() {
    this.isAdmin = !this.isAdmin;
  }
  constructor(private twilioService: TwilioService) {}

  toggleChatPopup(){
     this.viewChatPopup = !this.viewChatPopup;
   //  console.log(this.viewChatPopup);
     if(this.viewChatPopup){
       console.log(this.isAdmin)
       this.isAdmin ? this.getTwilioToken('login1') : this.getTwilioToken('login2')
     }
  }


  ngOnInit(): void {

  }

  getTwilioToken(action: string){
    this.twilioService.getAccessToken("tokenghah", action)
      .subscribe(({token}) => {
        if (token) {
          this.twilioToken= token;
      //    console.log(this.twilioToken);
        }
      });
  }




}
