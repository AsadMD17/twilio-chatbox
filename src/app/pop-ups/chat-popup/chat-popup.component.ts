import {Component, Output, EventEmitter, OnInit, Input, OnChanges, SimpleChanges} from '@angular/core';
import {TwilioService} from "../../shared/services/twilio.service";
import {Conversation, Message, Paginator, Participant} from "@twilio/conversations";
import {FormsModule} from "@angular/forms";
import {DatePipe} from "@angular/common";
import {StoreService} from "../../shared/services/store.service";

@Component({
  selector: 'app-chat-popup',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe

  ],
  templateUrl: './chat-popup.component.html',
  styleUrl: './chat-popup.component.css'
})
export class ChatPopupComponent implements OnInit, OnChanges{
  @Output() closePopupCalled: EventEmitter<any> = new EventEmitter();
  @Input() twilioToken: string = '';
  @Input() currentUser: string = '';
  @Input() currentConversation : any = null;
  myConversations: Conversation[] = [];
  participants :Participant[] = [];
  onChangeCount = 0;
  messages!: Message[];
  paginator!: Paginator<Message>;
  messageInput :string = '';
  selectedFile: any;
  documentUrls: any = {};
  previewableContentTypes = [
    'image/jpeg',
    'image/png',]
  currentWindow = 'chat';
  chatConversationName = 'joshSupport'
  noteConversationName = 'AmytestconvNotes'



  constructor(
    private twilioService: TwilioService,
    private store: StoreService
  ) {}

  ngOnInit() {
    if (this.currentUser.includes('Team') ){
      this.currentWindow = 'note'
    }


    this.store.activeConversation.subscribe(conversation => {
      this.currentConversation = conversation;
      if( Object.keys(this.currentConversation).length !== 0) {
        console.log(this.currentConversation.uniqueName);
        this.currentConversation.getMessages()
          .then((paginator: Paginator<Message>) => {
            this.paginator = paginator;
            this.messages = paginator.items;
            const container = document.getElementById('chat-box');
            if(container) {
              container.scrollTo(0, container.scrollHeight);
            }
          });
        this.currentConversation?.on('messageAdded', (message: Message) => {
          const messageExist = this.messages.filter(f => f.sid === message.sid);
          if(!messageExist?.length){
            this.messages?.push(message);
          }
          const container = document.getElementById('chat-box');
          setTimeout(() => {
            if(container) {
              container.scrollTo(0, container.scrollHeight);
            }
          }, 200);
          if (this.messages[this.messages.length - 1].type === 'media'){
            this.messages[this.messages.length - 1].getTemporaryContentUrlsForAttachedMedia().then((url) => {
              const keys = Object.keys(url)
              for (const [key, value] of url.entries()) {
                this.documentUrls[message.sid] = value;
              }
              const container = document.getElementById('chat-box');
              setTimeout(() => {
                if(container) {
                  container.scrollTo(0, container.scrollHeight);
                }
              }, 200);
            })
          }
        });
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['twilioToken'] && this.onChangeCount == 0 && this.twilioToken !==''){
      this.onChangeCount++;
      this.twilioService.getConversationByUniqueName(this.twilioToken, this.currentConversation.uniqueName).then((conversation) =>{
        this.currentConversation = conversation;
        this.store.setActiveConversation(conversation);
        this.getConversationMessages()
      });
    }
  }

  closePopup() {
      this.closePopupCalled.emit(null);
  }

  async getConversations() :Promise<Conversation[]>  {
    this.myConversations = await this.twilioService.getUserConversations(this.twilioToken);
    console.log(this.myConversations)
    return this.myConversations
  }

  async createConversation(){
    if (!this.currentConversation){
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const conversation: Conversation = await this.twilioService.createConversation(this.chatConversationName,this.twilioToken);
        this.myConversations.unshift(conversation);
      } catch (error) {
        console.log(error);
        console.log('String(error)');
      } finally {
        await this.addParticipant('Josh');
      }
      console.log('conversation')
      // this.addParticipant('user')
    }
    await this.addParticipant('Josh');
  }

  async addParticipant(user_name :string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.twilioService.getAccessToken( user_name, 'login2')
      .subscribe(async ({token}) => {
        try {
          await this.twilioService.getUserConversations(token);
          token = '';
        } catch (error) {
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await this.currentConversation.add(user_name);
        //   this.getParticipants();
        //   this.addParticipantInput.setValue('');
         } catch (error) {
          // this.error = true;
          // this.errorMessage = 'Can not add participant';
        } finally {
          //this.loading = false;
        }
      });

  }

  async getParticipants() {
    try {
      this.participants = await this.currentConversation.getParticipants();
    } catch (error) {
        console.log(error)
    }
    finally {
     // this.loading = false;
    }
  }

  sendMessage() {


    const deleimiter = this.currentWindow == 'note' ? 'note' : 'chat';
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (this.messageInput && this.messageInput.trim().length > 0) {
      this.currentConversation.sendMessage(this.messageInput, {messageType:deleimiter})
        .then(() => {
          this.messageInput = '';
          const container = document.getElementById('chat-box');
          if(container) {
            container.scrollTo(0, container.scrollHeight);
          }
        });
    }
  }

  getConversationMessages(){
    this.currentConversation.getMessages()
      .then((paginator: Paginator<Message>) => {
        this.paginator = paginator;
        this.messages = paginator.items;
        const container = document.getElementById('chat-box');
        if(container) {
          container.scrollTo(0, container.scrollHeight);
        }
      }).then(()=>{
        this.messages.map(( message )=>{
          if (message.type == 'media'){
            message.getTemporaryContentUrlsForAttachedMedia().then((url) => {
              const keys = Object.keys(url)
              for (const [key, value] of url.entries()) {
                this.documentUrls[message.sid] = value;
              }
              console.log(this.documentUrls);
            })
          }

         });
         const container = document.getElementById('chat-box');
         if(container) {
           container.scrollTo(0, container.scrollHeight);
         }
    });
  }

  getMessageMedia(messageSid :string) :string {
    return this.documentUrls[messageSid];
  }
  uploadFile(event: Event) {
    const deleimiter = this.currentWindow == 'note' ? 'note' : 'chat';

    // @ts-ignore
    const fileInput = event.target;
    // @ts-ignore
    const file = fileInput.files[0];
    console.log(file)
    this.currentConversation.sendMessage({
      contentType: file.type,
      media: file,
    }, {messageType:deleimiter}).then(() => {
      const container = document.getElementById('chat-box');
      if(container) {
        container.scrollTo(0, container.scrollHeight);
      }
    })
  }


  isPreviewable(contentType: string ): boolean{
     return this.previewableContentTypes.includes(contentType);
  }

  clickChat() {
    this.currentWindow ='chat';
  }

  clickNote() {
    this.currentWindow ='note';
  }
}
