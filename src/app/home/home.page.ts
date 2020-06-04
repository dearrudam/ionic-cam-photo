import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Platform, AlertController, ToastController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';

import { Camera, CameraOptions, PictureSourceType, EncodingType, DestinationType } from '@ionic-native/Camera/ngx';
import { FileOpener } from '@ionic-native/file-opener/ngx';
import { File, Entry } from '@ionic-native/file/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';
// import { FilePath } from '@ionic-native/file-path/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit {

  directories = [];
  folder = '';
  copyFile: Entry = null;
  shouldMove = false;
  dataDirectory;

  constructor(
    private file: File,
    private plt: Platform,
    private alertCtrl: AlertController,
    private fileOpener: FileOpener,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private webview: WebView,
    private camera: Camera,
    // private ref: ChangeDetectorRef,
    // private filePath: FilePath,
  ) { }

  ngOnInit() {
    this.folder = this.route.snapshot.paramMap.get('folder') || '';
    this.plt.ready().then(() => {
      this.dataDirectory = this.file.externalApplicationStorageDirectory;
      console.log(`this.dataDirectory = ${this.dataDirectory}`);
      this.loadDocuments();
    });
  }

  loadDocuments() {
    this.plt.ready().then(() => {
      // Reset for later copy/move operations
      this.copyFile = null;
      this.shouldMove = false;

      this.file.listDir(`${this.dataDirectory}`, this.folder).then(res => {
        console.log(`listing the files into = ${this.dataDirectory}/${this.folder}`);
        this.directories = res;
      });
    });
  }

  async createFolder() {
    const alert = await this.alertCtrl.create({
      header: 'Create folder',
      message: 'Please specify the name of the new folder',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'MyDir'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.file
              .createDir(
                `${this.dataDirectory}/${this.folder}`,
                data.name,
                false
              )
              .then(res => {
                this.loadDocuments();
              });
          }
        }
      ]
    });

    await alert.present();
  }

  async createFile() {
    const alert = await this.alertCtrl.create({
      header: 'Create file',
      message: 'Please specify the name of the new file',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'MyFile'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Create',
          handler: data => {
            this.file
              .writeFile(
                `${this.dataDirectory}/${this.folder}`,
                `${data.name}.txt`,
                `My custom text - ${new Date().getTime()}`
              )
              .then(res => {
                this.loadDocuments();
              });
          }
        }
      ]
    });

    await alert.present();
  }

  deleteFile(file: Entry) {
    const path = this.dataDirectory + this.folder;
    this.file.removeFile(path, file.name).then(() => {
      this.loadDocuments();
    });
  }

  startCopy(file: Entry, moveFile = false) {
    this.copyFile = file;
    this.shouldMove = moveFile;
  }

  async itemClicked(file: Entry) {

    console.log(`file.toInternalURL(): ${file.toInternalURL()}`);
    if (this.copyFile) {
      // Copy is in action!
      if (!file.isDirectory) {
        const toast = await this.toastCtrl.create({
          message: 'Please select a folder for your operation'
        });
        await toast.present();
        return;
      }
      // Finish the ongoing operation
      this.finishCopyFile(file);
    } else {
      // Open the file or folder
      if (file.isFile) {
        this.fileOpener.open(file.nativeURL, 'text/plain');
      } else {
        const pathToOpen =
          this.folder !== '' ? this.folder + '/' + file.name : file.name;
        const folder = encodeURIComponent(pathToOpen);
        this.router.navigateByUrl(`/home/${folder}`);
      }
    }
  }

  finishCopyFile(file: Entry) {
    const path = this.dataDirectory + this.folder;
    const newPath = this.dataDirectory + this.folder + '/' + file.name;

    if (this.shouldMove) {
      if (this.copyFile.isDirectory) {
        this.file
          .moveDir(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      } else {
        this.file
          .moveFile(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      }
    } else {
      if (this.copyFile.isDirectory) {
        this.file
          .copyDir(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      } else {
        this.file
          .copyFile(path, this.copyFile.name, newPath, this.copyFile.name)
          .then(() => {
            this.loadDocuments();
          });
      }
    }
  }


  pathForImage(img) {
    if (img === null) {
      return '';
    } else {
      const converted = this.webview.convertFileSrc(img);
      return converted;
    }
  }


  takePicture() {
    this.plt.ready()
      .then(async () => {
        const options: CameraOptions = {
          quality: 20,
          sourceType: PictureSourceType.CAMERA,
          saveToPhotoAlbum: false,
          encodingType: EncodingType.JPEG,
          correctOrientation: true,
          destinationType: DestinationType.FILE_URL,
        };
        console.log(await this.camera.getPicture(options)
          .then((imagePath) => {
            const currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
            const correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
            this.file
              .moveFile(correctPath, currentName, `${this.dataDirectory}/${this.folder}`, currentName)
              .then(async () => {
                this.loadDocuments();
              });
          }).catch((err) => console.log));
      });
  }

  async presentToast(text) {
    const toast = await this.toastCtrl.create({
      message: text,
      position: 'bottom',
      duration: 3000
    });
    toast.present();
  }

}
