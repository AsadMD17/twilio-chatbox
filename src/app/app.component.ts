import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatPopupComponent } from "./pop-ups/chat-popup/chat-popup.component";
import { TwilioService } from "./shared/services/twilio.service";
import {Conversation, Participant} from "@twilio/conversations";
import { StoreService } from "./shared/services/store.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatPopupComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'twilio-chatbox';
  viewChatPopup = false;
  twilioToken = '';
  isAdmin = true;
  users = ['Michal.User', 'Josh.Support', 'Ede.Team', 'Dany.Team']
  conversationName = 'myTestConversation30'
  currentConversation: any = null;
  currentUser = '';
  participants: Participant[] = []


  userToggle() {
    this.isAdmin = !this.isAdmin;
  }
  constructor(
    private twilioService: TwilioService,
    private store: StoreService
  ) { }

  toggleChatPopup() {
    this.viewChatPopup = !this.viewChatPopup;
  }


  async ngOnInit(): Promise<void> {

  }

  async getTwilioToken(name: string) {
    this.twilioService.getAccessToken(name, "login")
      .subscribe(async ({token}) => {
        if (token) {
          this.twilioToken = token;
          await this.initializeConversation(token)
          console.log(this.twilioToken);
        }
      });
  }



  loginAs(name: string) {
    console.log(name);
    this.currentUser = name;
    this.getTwilioToken(name).then(r => {
    });
  }

  async findConversation(token: string): Promise<Conversation | null> {
    try {
      return await this.twilioService.getConversationByUniqueName(token, this.conversationName);
    } catch (error) {
      return null;
    }
  }

  async addParticipant(user_name: string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.twilioService.getAccessToken(user_name, 'login')
      .subscribe(async ({ token }) => {
        try {
          await this.twilioService.getUserConversations(token);
        } catch (error) {
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await this.currentConversation.add(user_name);
        } catch (error) {
          console.log('Can not add participant');
        } finally {
        }
      });
  }

  async createConversation(token: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.currentConversation = await this.twilioService.createConversation(this.conversationName, token);
      this.store.setActiveConversation(this.currentConversation);
    } catch (error) {
      console.log(error)
      console.log('Error in  creating Conversation');
    } finally {
      for (const index in this.users) {
        console.log('user name', this.users[index]);
        await this.addParticipant(this.users[index])
      }
    }
  }

  async getParticipants() {
    try {
      this.participants = await this.currentConversation?.getParticipants();
    } catch (error) {
      console.log(error)
    }
    finally {
      // this.loading = false;
    }
  }

  async initializeConversation(token: string){
    const conversation = await this.findConversation(token);
    if (conversation) {
      console.log('conversation Found')
      this.currentConversation= conversation;
      this.store.setActiveConversation(conversation);
      await this.getParticipants().then(()=>{
      });
    }else {
      console.log('conversation Not Found');
      console.log('creating Conversation')
      await this.createConversation(token).then(async () => {
        await this.getParticipants()
      })
    }
    console.log(this.currentConversation);
    console.log(this.participants);
  }




}
