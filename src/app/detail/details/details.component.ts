import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { iDocument, iDocumentDTO } from 'src/app/models/document.model';
import { iCurrentUserState } from 'src/app/models/user.model';
import { DocumentsApiService } from 'src/app/services/documents.api.service';
import { UsersApiService } from 'src/app/services/users.api.service';
import { AppState } from 'src/app/state/app.state';
import { loadCurrentUser } from 'src/app/state/currentUser.reducer/currentUser.action.creators';
import {
  addDocument,
  deleteDocument,
  updateDocument,
} from 'src/app/state/documents.reducer/documents.action.creators';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements OnInit {
  documentData!: {
    title: string;
    contentString: string;
    keywordsString: string;
  };
  documentId!: string;
  document!: iDocument;
  currentUserData!: iCurrentUserState;
  errorMessage!: string;
  isMine!: boolean;
  editEnable!: boolean;
  forkPrompt: string = 'Confirma que deseas copiar este documento a tu lista';
  deletePrompt: string = 'Confirma que deseas borrar este documento';
  showForkPrompt!: boolean;
  showDeletePrompt!: boolean;
  willReload!: boolean;

  constructor(
    public documentApi: DocumentsApiService,
    public store: Store<AppState>,
    public router: Router,
    public route: ActivatedRoute,
    public usersApi: UsersApiService
  ) {}

  ngOnInit(): void {
    this.errorMessage = 'Cargando...';
    this.isMine = false;
    this.editEnable = false;
    this.showForkPrompt = false;
    this.showDeletePrompt = false;
    this.route.paramMap
      .subscribe({
        next: (data) => {
          this.documentId = this.nothing(data.get('id') as string);
          this.store
            .select((state) => state.documents)
            .subscribe({
              next: (data) => {
                const docFind = data.documents.find(
                  (doc) => doc._id === this.documentId
                );
                if (docFind) {
                  this.document = docFind;
                  this.errorMessage = '';
                  this.prepareForm();
                  this.store
                    .select((state) => state.currentUser)
                    .subscribe({
                      next: (data) => {
                        this.isMine =
                          data.user._id === this.document.author._id;
                        this.currentUserData = data;
                      },
                    })
                    .unsubscribe();
                } else {
                  this.documentApi.getDocument(this.documentId).subscribe({
                    next: (data) => {
                      if (!data) this.router.navigate(['notFound']);
                      this.document = data;
                      this.errorMessage = '';
                      this.prepareForm();
                      this.store.dispatch(addDocument({ newDocument: data }));
                      this.store
                        .select((state) => state.currentUser)
                        .subscribe({
                          next: (data) => {
                            this.isMine =
                              data.user._id === this.document.author._id;
                            this.currentUserData = data;
                          },
                        })
                        .unsubscribe();
                    },
                    error: (err) => {
                      this.errorMessage = 'Documento no encontrado.';
                    },
                  });
                }
              },
            })
            .unsubscribe();
        },
      })
      .unsubscribe();
  }

  enableEdit() {
    this.editEnable = true;
  }

  handleCancel() {
    this.editEnable = false;
    this.prepareForm();
  }

  handleFork() {
    this.showForkPrompt = true;
  }

  handleForkPrompt(answer: boolean) {
    this.showForkPrompt = false;
    if (answer) {
      this.documentApi
        .forkDocument(this.document._id, this.currentUserData.token)
        .subscribe({
          next: (data) => {
            this.store.dispatch(addDocument({ newDocument: data }));
            this.usersApi
              .loginUser(undefined, this.currentUserData.token)
              .subscribe({
                next: (data2) => {
                  this.store.dispatch(
                    loadCurrentUser({
                      currentUser: data2.user,
                      token: data2.token,
                    })
                  );
                  this.currentUserData = data2;
                  this.router.navigate(['/documents/docs']);
                },
              });
          },
        });
    }
  }

  handleFavourite() {
    if (!this.isFavourite()) {
      this.documentApi
        .addFavourite(this.document._id, this.currentUserData.token)
        .subscribe({
          next: (data) => {
            const updatedUser = {
              ...this.currentUserData.user,
              myFavs: [...this.currentUserData.user.myFavs, data],
            };
            this.store.dispatch(
              loadCurrentUser({
                currentUser: updatedUser,
                token: this.currentUserData.token,
              })
            );
            this.currentUserData = {
              user: updatedUser,
              token: this.currentUserData.token,
            };
          },
        });
    } else {
      const updatedUser = {
        ...this.currentUserData.user,
        myFavs: [
          ...this.currentUserData.user.myFavs.filter(
            (item) => item._id !== this.document._id
          ),
        ],
      };
      this.usersApi
        .updateUser(updatedUser, this.currentUserData.token)
        .subscribe({
          next: (data) => {
            this.store.dispatch(
              loadCurrentUser({
                currentUser: data,
                token: this.currentUserData.token,
              })
            );
            this.currentUserData = {
              user: data,
              token: this.currentUserData.token,
            };
          },
        });
    }
  }

  isFavourite() {
    if (this.currentUserData.token) {
      return Boolean(
        this.currentUserData.user.myFavs.find(
          (item) => item._id === this.document._id
        )
      );
    } else {
      return false;
    }
  }

  handleSubmit() {
    const updatedDocument: Partial<iDocumentDTO> = {};
    if (this.documentData.title !== this.document.title)
      updatedDocument.title = this.documentData.title;
    if (this.documentData.contentString !== this.document.content[0].text)
      updatedDocument.content = [
        {
          text: this.documentData.contentString,
          options: [{ key: '', value: '' }],
        },
      ];
    if (this.documentData.keywordsString !== this.document.keywords.join(', '))
      updatedDocument.keywords = this.documentData.keywordsString
        .split(',')
        .map((item) => item.trim());
    this.documentApi
      .updateDocument(
        this.document._id,
        updatedDocument,
        this.currentUserData.token
      )
      .subscribe({
        next: (data) => {
          this.store.dispatch(
            updateDocument({ id: data._id, modifiedDocument: data })
          );
          this.usersApi
            .loginUser(undefined, this.currentUserData.token)
            .subscribe({
              next: (data) =>
                this.store.dispatch(
                  loadCurrentUser({
                    currentUser: data.user,
                    token: data.token,
                  })
                ),
            });
          this.editEnable = false;
        },
      });
  }

  handleDelete() {
    this.showDeletePrompt = true;
  }

  handleDeletePrompt(answer: boolean) {
    if (answer) {
      this.router.navigate(['favs']);
      this.documentApi
        .deleteDocument(this.document._id, this.currentUserData.token)
        .subscribe({
          next: (data) => {
            this.store.dispatch(deleteDocument({ idToDelete: data._id }));
            this.updateUserLogin();
          },
        });
    }
    this.showDeletePrompt = false;
  }

  updateUserLogin() {
    this.usersApi.loginUser(undefined, this.currentUserData.token).subscribe({
      next: (userData) => {
        this.store.dispatch(
          loadCurrentUser({
            currentUser: userData.user,
            token: userData.token,
          })
        );
        this.currentUserData = userData;
      },
    });
  }

  prepareForm() {
    if (this.document) {
      this.documentData = {
        title: this.document.title,
        contentString: this.document.content[0].text,
        keywordsString: this.document.keywords.join(', '),
      };
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key == 'Tab' && this.editEnable) {
      event.preventDefault();
      const eventTarget = event.target as HTMLFormElement;
      const start = eventTarget['selectionStart'];
      const end = eventTarget['selectionEnd'];
      eventTarget['value'] =
        eventTarget['value'].substring(0, start) +
        '\t' +
        eventTarget['value'].substring(end);
      eventTarget['selectionStart'] = eventTarget['selectionEnd'] = start + 1;
    }
  }

  // for testing purpouses
  nothing(thing: string) {
    return thing;
  }
}
