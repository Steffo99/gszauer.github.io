import UITextButton from "./UITextButton.js";
import UISettingsWindow from "./UISettingsWindow.js";
import UITutorialWindow from "./UITutorialWindow.js";
import CardPlayer from "./CardPlayer.js";

export default class SceneMenu extends Phaser.Scene {
    constructor() {
        super('SceneMenu');
    }

    static DoPreload(scene) {
        scene.load.atlas('Tutorial', 'war/Tutorial.jpg', 'war/Tutorial.json');
        scene.load.atlas('Solid', 'war/Solid.jpg', 'war/Solid.json');
        scene.load.atlas('Clear', 'war/Clear.png', 'war/Clear.json');
        scene.load.bitmapFont('Adventure', 'war/Adventure.png', 'war/Adventure.fnt');
        scene.load.bitmapFont('LifeCraft', 'war/LifeCraft.png', 'war/LifeCraft.fnt');
        scene.load.image('Background', 'war/Background.jpg');

        scene.load.audio("ButtonHover", ["war/Hover.ogg", "war/Hover.mp3", "war/Hover.m4a"]);
        scene.load.audio("ButtonClick", ["war/Click.ogg", "war/Click.mp3", "war/Click.m4a"]);
    }

    preload() {
        
    }

    create() {
        const self = this;

        this.background = {};
        {
            this.background.top = this.add.image(0, 0, "Background");
            this.background.top.x += this.background.top.width / 2;
            this.background.top.y += this.background.top.height / 2;

            this.background.bottom = this.add.image(0, 0, "Background");
            this.background.bottom.x = this.background.top.x;
            this.background.bottom.y = this.background.top.y + this.background.top.height;
            this.background.bottom.flipY = true;
        }

        this.logo = this.add.sprite(0, 0, "Clear", "Logo.png");
        this.logo.setOrigin(0, 0);
        this.logo.x = 33;
        this.logo.y = 55;

        this.skull = this.add.sprite(0, 0, "Clear", "Skull.png");
        this.skull.setOrigin(0, 0);
        this.skull.x = 420;
        this.skull.y = 839;

        this.buttons = { };
        {
            this.buttons.background = this.add.sprite(0, 0, "Solid", "ButtonsBackground.png");
            this.buttons.background.setOrigin(0, 0);
            this.buttons.background.x = 45;
            this.buttons.background.y = 1024;
            this.buttons.background.scaleX = 2.0;
            this.buttons.background.scaleY = 2.07;

            this.buttons.frameT = this.add.sprite(0, 0, "Solid", "ButtonsConnect.png");
            this.buttons.frameT.x = 492;
            this.buttons.frameT.y = 1028;
            this.buttons.frameB = this.add.sprite(0, 0, "Solid", "ButtonsConnect.png");
            this.buttons.frameB.x = 492;
            this.buttons.frameB.y = 1980;
            this.buttons.frameB.flipY = true;
            this.buttons.frameL = this.add.sprite(0, 0, "Solid", "ButtonsConnect.png");
            this.buttons.frameL.angle = -90;
            this.buttons.frameL.x = 49;
            this.buttons.frameL.y = 1536;
            this.buttons.frameR = this.add.sprite(0, 0, "Solid", "ButtonsConnect.png");
            this.buttons.frameR.angle = 90;
            this.buttons.frameR.x = 972;
            this.buttons.frameR.y = 1536;

            this.buttons.frameTL = this.add.sprite(0, 0, "Clear", "ButtonsCorner.png");
            this.buttons.frameTL.x = 168;
            this.buttons.frameTL.y = 1147;
            this.buttons.frameBL = this.add.sprite(0, 0, "Clear", "ButtonsCorner.png");
            this.buttons.frameBL.x = 168;
            this.buttons.frameBL.y = 1860;
            this.buttons.frameBL.flipY = true;
            this.buttons.frameTR = this.add.sprite(0, 0, "Clear", "ButtonsCorner.png");
            this.buttons.frameTR.flipX = true;
            this.buttons.frameTR.x = 852;
            this.buttons.frameTR.y = 1147;
            this.buttons.frameBR = this.add.sprite(0, 0, "Clear", "ButtonsCorner.png");
            this.buttons.frameBR.flipX = true;
            this.buttons.frameBR.x = 852;
            this.buttons.frameBR.y = 1860;
            this.buttons.frameBR.flipY = true;
        }

        this.buttons.play = new UITextButton({
            scene: this,
            x: 512, y: 1206,
            text: "Play",
            onClick: () => {
                self.ButtonClick();
                if (Math.floor(Math.random() * 10) < 5) {
                    CardPlayer.playerFrame = "CardBoy.png";
                }
                else {
                    CardPlayer.playerFrame = "CardGirl.png";
                }
                self.scene.get('SceneDungeon').UpdatePlayerSprite();
                self.scene.switch('SceneDungeon'); 
            },
            onEnter: () => {
                self.ButtonHover();
            }
        });
        this.buttons.tutorial = new UITextButton({
            scene: this,
            x: 512, y: 1513,
            text: "Tutorial",
            onEnter: () => {
                self.ButtonHover();
            }
        });
        this.buttons.options = new UITextButton({
            scene: this,
            x: 512, y: 1820,
            text: "Settings",
            onEnter: () => {
                self.ButtonHover();
            }
        });

        this.settings = new UISettingsWindow({
            scene: self,
            onOpen: () => {
                self.buttons.play.Disabled = true;
                self.buttons.tutorial.Disabled = true;
                self.buttons.options.Disabled = true;
            },
            onClose: () => {
                self.buttons.play.Disabled = false;
                self.buttons.tutorial.Disabled = false;
                self.buttons.options.Disabled = false;
            }
        });

        this.tutorial = new UITutorialWindow({
            scene: self,
            onOpen: () => {
                self.buttons.play.Disabled = true;
                self.buttons.tutorial.Disabled = true;
                self.buttons.options.Disabled = true;
            },
            onClose: () => {
                self.buttons.play.Disabled = false;
                self.buttons.tutorial.Disabled = false;
                self.buttons.options.Disabled = false;
            }
        });

        this.buttons.options.OnClick = () => {
            self.ButtonClick();
            self.settings.Open();
        }

        this.buttons.tutorial.OnClick = () => {
            self.ButtonClick();
            self.tutorial.Open();
        }

        this.buttonHoverSound = this.sound.add("ButtonHover");
        this.buttonClickSound = this.sound.add("ButtonClick");
    }

    ButtonHover() {
        this.buttonHoverSound.play();
    }

    ButtonClick() {
        this.buttonClickSound.play();
    }
}