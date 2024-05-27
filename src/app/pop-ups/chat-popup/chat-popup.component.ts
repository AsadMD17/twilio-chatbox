import {Component, Output, EventEmitter, OnInit, Input, OnChanges, SimpleChanges, input} from '@angular/core';
import {TwilioService} from "../../shared/services/twilio.service";
import {Conversation, Message, Paginator, Participant, User, UserUpdateReason} from "@twilio/conversations";
import {FormsModule} from "@angular/forms";
import {DatePipe} from "@angular/common";
import {StoreService} from "../../shared/services/store.service";
import {filter} from "rxjs";

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
  @Input() participants: Participant[] = [];
  filteredParticipants:  string[]= [];
  allParticipants: string[] = [];
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

  participantsStatus = new Map<string, boolean>();
  isAtKeyPressed: boolean = false;

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
      if(Object.keys(this.currentConversation).length !== 0) {
        this.userStatusListener();
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
      this.addUserStatuses();
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

  sendMessage() {
    const deleimiter = this.currentWindow == 'note' ? '__##__' : '';
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (this.messageInput && this.messageInput.trim().length > 0) {
      this.currentConversation.sendMessage(deleimiter + this.messageInput)
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

  addUserStatuses(){
    if (this.participants) {
      this.participants.forEach((async (participant)=> {
        this.allParticipants.push(<string>participant.identity);
        const user: User = await participant.getUser();
        if(participant.identity && user.isOnline != null){
          this.participantsStatus.set(participant.identity.toString(), user.isOnline);
        }
      }));
    }
    this.filteredParticipants = this.allParticipants
  }


  userStatusListener(){
    if (this.participants) {
      this.participants.forEach((async (participant)=>{
        const user: User = await participant.getUser();

        user.on('updated', ({ user, updateReasons}: {
          user: User,
          updateReasons: UserUpdateReason[]
        }) => {
          if (updateReasons.includes("reachabilityOnline")) {
            if(participant.identity && user.isOnline != null){
              this.participantsStatus.set(participant.identity.toString(), user.isOnline);
              console.log(user.identity , user.isOnline);
            }
          }
          console.log(this.participantsStatus);
        })
      }));
    }
  }

  messageMediaType(message: Message){
    return (message.attributes as any).messageType as string
  }

  protected readonly JSON = JSON;

  checkForKeyPress(event: KeyboardEvent) {

    const trimmedInput = this.messageInput.trim();
    const lastWord = trimmedInput.split(/\s+/).pop();

    // Return the last word from the array
    if (event.key === '@' && lastWord?.at(0) == '@') {
      this.isAtKeyPressed = true;
    }else if (lastWord?.at(0) !== '@'){
      this.filteredParticipants = this.allParticipants
      this.isAtKeyPressed = false;
    }

    if (lastWord?.at(0) == '@'){
      this.filterStrings(this.allParticipants,lastWord.substring(1))
    }
  }

  filterStrings(list:string[], searchTerm: string): void {
     const lowerCaseSearchTerm = searchTerm.toLowerCase();
     this.filteredParticipants = list.filter(item => item.toLowerCase().includes(lowerCaseSearchTerm));
  }


  onDropDownParticipantClick(participant: string) {
    const trimmedInput = this.messageInput.trim();
    const wordsArray = trimmedInput.split(/\s+/);
    wordsArray.pop();
    let lastWord = ' @'+participant;
    wordsArray.push(lastWord);
    this.messageInput = wordsArray.join(' ');
    this.messageInput = this.messageInput + ' ';
    this.isAtKeyPressed= false;
  }
}
