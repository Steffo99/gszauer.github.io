import UIView from './UIView.js'
import UIGlobals from './UIGlobals.js'

export default class UITabView extends UIView {
    _border = null;
    _background = null;

    _active = null;
    _activeKey = null;

    _tags = [];
    _views = new Map()

    _tagLabels = [];
    _tagBackgrounds = [];
    _seperators = [];

    _laidOutForTheFirstTime = false;

    _visible = true;
    hideHeader = false;

    onViewChanged = null;//(view, label)

    constructor(scene, parent = null, hideHeader = false) {
        super(scene, parent);
        this.hideHeader = hideHeader;

        if (!hideHeader) {
            this._border = scene.add.sprite(0, 0, UIGlobals.Atlas, UIGlobals.Solid);
            this._border.setOrigin(0, 0);
            this._border.setDepth(UIGlobals.WidgetLayer);

            this._background = scene.add.sprite(0, 0, UIGlobals.Atlas, UIGlobals.Solid);
            this._background.setOrigin(0, 0);
            this._background.setDepth(UIGlobals.WidgetLayer);
        }

        const self = this;

        scene.input.on("pointerup", function(pointer, currentlyOver) {
            if (UIGlobals.Active != null && !self.hideHeader) {
                let active = null;
                let activeIndex = -1;

                const size = self._tagBackgrounds.length;
                for (let i = 0; i < size; ++i) {
                    if (self._tagBackgrounds[i] == UIGlobals.Active) {
                        active = self._tagBackgrounds[i];
                        activeIndex = i;
                        break;
                    }
                }

                if (active != null) {
                    let left = active.x;
                    let right = left + active.scaleX;
                    let top = active.y;
                    let bottom = top + active.scaleY;

                    if (pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom) {
                        const oldActive = self._active;
                        const oldActiveKey = self._activeKey;
                        
                        self._active = self._views.get(self._tags[activeIndex]);
                        self._activeKey = self._tags[activeIndex];

                        if (self._activeKey != oldActiveKey) {
                            //console.log("Switch to tag " + self._tags[activeIndex]);
                            self._ActiveViewChanged(oldActive, oldActiveKey);
                        }
                    }
                    
                    UIGlobals.Active = null;
                    UIGlobals.Hot = null;
                    self.UpdateColors();
                }
            }
        });
    }

    _ActiveViewChanged(oldActive, oldActiveKey) {
        if (oldActive != null) {
            oldActive.Hide();
        }
        const newActive = this._active;
        if (newActive != null) {
            newActive.Show();
        }
        if (this.onViewChanged != null) {
            let _key = "";
            for (let [key, value] of this._views.entries()) {
                if (value === newActive) {
                    _key = key;
                    break;
                }
            }
            this.onViewChanged(newActive, _key);
        }
        this.Layout(this._x, this._y, this._width, this._height);
    }

    Get(name) {
        if (this._views.has(name)) {
            return this._views.get(name);
        }
        return null;
    }

    Activate(tag) {
        if (this._active != null) {
            this._active.Hide();
        }

        const index = this._tags.indexOf(tag);
        if (index >= 0) {
            this._activeKey = tag;
            this._active = this._views.get(tag);
        }
        else {
            this._activeKey = "";
            this._active = null;
        }

        if (this._active != null) {
            if (this._visible) {
                this._active.Show();
            }
            this.Layout();
            this._active.UpdateColors();
        }
    }
    
    Add(name, view = null) {
        const self = this;
        const scene = this._scene;

        this._tags.push(name);
        this._views.set(name, view);

        let background = null;
        let seperator = null;
        let label = null;

        if (!this.hideHeader) {
            background = scene.add.sprite(0, 0, UIGlobals.Atlas, UIGlobals.Solid);
            background.setOrigin(0, 0);
            background.setDepth(UIGlobals.WidgetLayer);
            this._tagBackgrounds.push(background);

            seperator = scene.add.sprite(0, 0, UIGlobals.Atlas, UIGlobals.Solid);
            seperator.setOrigin(0, 0);
            seperator.setDepth(UIGlobals.WidgetLayer);
            this._seperators.push(seperator);

            label = scene.add.bitmapText(0, 0, UIGlobals.Font100, name);
            label.setDepth(UIGlobals.WidgetLayer);
            this._tagLabels.push(label);
        }

        if (this._activeKey == null) {
            this._active = view;
            this._activeKey = name;
        }
        else {
            if (view != null) {
                view.Hide();
            }
        }

        if (!this.hideHeader) {
            background.setInteractive();
            background.on("pointerover", function (pointer, localX, localY, event) {
                if (UIGlobals.Active == null) {
                    UIGlobals.Hot = background;
                }

                self.UpdateColors();
            });
            background.on("pointerout", function (pointer, event) {
                if (UIGlobals.Hot == background) {
                    UIGlobals.Hot = null;
                }

                self.UpdateColors();
            });
            background.on("pointerdown", function (pointer, localX, localY, event) {
                UIGlobals.Active = background;

                self.UpdateColors();
            });
        }
    }

    UpdateColors() {
        let bgColor = UIGlobals.Colors.BackgroundLayer1;
        let borderColor = UIGlobals.Colors.BorderDecorative;

        if (!this.hideHeader) {
            this._border.setTint(borderColor);
            this._background.setTint(bgColor);
        }

        if (this._active != null) {
            this._active.UpdateColors();
        }

        let textColor = UIGlobals.Colors.ElementBorderTintIdle;

        const size = this._tagLabels.length;
        for (let i = 0; i < size; ++i) {
            if (UIGlobals.Active == this._tagBackgrounds[i]) {
                textColor = UIGlobals.Colors.ElementBorderTintActive;
                bgColor = UIGlobals.Colors.BackgroundLayer2;
            }
            else if (UIGlobals.Hot == this._tagBackgrounds[i]) {
                textColor = UIGlobals.Colors.ElementBorderTintHot;
                bgColor = UIGlobals.Colors.BackgroundLayer2;
            }
            else if (this._activeKey == this._tags[i]) {
                textColor = UIGlobals.Colors.ElementBorderTintIdle;
                bgColor = UIGlobals.Colors.BackgroundLayer0;
            }
            else {
                bgColor = UIGlobals.Colors.BackgroundLayer1;
                textColor = UIGlobals.Colors.ElementBorderTintIdle;
            }

            this._tagLabels[i].setTint(textColor);
            this._tagBackgrounds[i].setTint(bgColor);
            this._seperators[i].setTint(borderColor);
        }
    }
    
    Layout(x, y, width, height) {
        if(x === undefined) { x = this._x; }
        if (y === undefined) { y = this._y; }
        if (width === undefined) { width = this._width; }
        if (height === undefined) { height = this._height; }

        if (width < 0) { width = 0; }
        if (height < 0) { height = 0; }
        super.Layout(x, y, width, height);

        let tabHeight = UIGlobals.Sizes.TabHeight;
        const bottomBorder = UIGlobals.Sizes.TabBorderSize;

        if (!this.hideHeader) {
            this._border.setPosition(x, y + tabHeight - bottomBorder * 2); // OVerfill, bottom border only
            this._border.setScale(width, bottomBorder * 2);

            this._background.setPosition(x, y);
            this._background.setScale(width, tabHeight - bottomBorder);
        }
        else {
            tabHeight = 0;
        }

        if (this._active != null) {
            this._active.Layout(x, y + tabHeight, width, height - tabHeight);
        }

        const size = this._tagLabels.length;
        const margin = UIGlobals.Sizes.TabMargin;
        tabHeight = tabHeight - bottomBorder;

        let _x = x;
        let _y = y;

        for (let i = 0; i < size; ++i) {
            const textW = this._tagLabels[i].width;

            this._tagBackgrounds[i].setPosition(_x, _y);
            this._tagBackgrounds[i].setScale(textW + margin * 2, tabHeight);

            _x += margin;
            this._tagLabels[i].setPosition(_x, _y + Math.floor(margin / 2));
            _x += textW + margin;

            this._seperators[i].setPosition(_x, _y);
            this._seperators[i].setScale(bottomBorder, tabHeight);

            _x += bottomBorder;
        }

        this.UpdateColors();
    }

    SetVisibility(visible) {
        this._visible = visible;

        if (this._active != null) {
            this._active.SetVisibility(visible);
        }
    }

    Show() {
        this.SetVisibility(true);
    }

    Hide() {
        this.SetVisibility(false);
    }
}