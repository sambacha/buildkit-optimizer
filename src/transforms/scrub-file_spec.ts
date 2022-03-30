/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://disco3.io/license
 */

/* eslint-disable max-len */
import { tags } from '@disco3-devkit/core';
import { transformJavascript } from '../helpers/transform-javascript';
import { createScrubFileTransformerFactory, testScrubFile } from './scrub-file';

const transform = (content: string) =>
  transformJavascript({
    content,
    getTransforms: [createScrubFileTransformerFactory(false)],
    typeCheck: true,
  }).content;
const transformCore = (content: string) =>
  transformJavascript({
    content,
    getTransforms: [createScrubFileTransformerFactory(true)],
    typeCheck: true,
  }).content;

describe('scrub-file', () => {
  const clazz = 'var Clazz = (function () { function Clazz() { } return Clazz; }());';

  describe('decorators', () => {
    it('removes top-level Angular decorators', () => {
      const output = tags.stripIndent`
        import { Injectable } from '@disco3/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.decorators = [ { type: Injectable } ];
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested Angular decorators', () => {
      const output = tags.stripIndent`
        import { Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.decorators = [ { type: Injectable } ];
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it("doesn't remove non Angular decorators", () => {
      const input = tags.stripIndent`
        import { Injectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }];
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });

    it('leaves non-Angular decorators in mixed arrays', () => {
      const input = tags.stripIndent`
        import { Injectable } from '@disco3/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: Injectable }, { type: NotInjectable }];
      `;
      const output = tags.stripIndent`
        import { Injectable } from '@disco3/core';
        import { NotInjectable } from 'another-lib';
        ${clazz}
        Clazz.decorators = [{ type: NotInjectable }];
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('__decorate', () => {
    it('removes Angular decorators calls in __decorate', () => {
      const output = tags.stripIndent`
      import { __decorate } from "tslib";
      import { Component, Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Component, Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            Injectable(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes Angular decorators calls when __decorate is inlined', () => {
      const output = tags.stripIndent`
        var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
        };

        import { Component, Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;

      const input = tags.stripIndent`
        var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
          else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
        };

        import { Component, Injectable } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            Injectable(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes constructor parameter metadata in __decorate', () => {
      const output = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Component, ElementRef } from '@disco3/core';
        import { LibService } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Component, ElementRef } from '@disco3/core';
        import { LibService } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            }),
            __metadata("design:paramtypes", [ElementRef, LibService])
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes constructor parameter metadata when static properties are present', () => {
      const output = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Injectable } from '@disco3/core';
        import { Logger } from 'another-lib';
        var GaService = (function () {
          function GaService(logger) {
            this.logger = logger;
          }
          GaService_1 = GaService;
          GaService.prototype.initializeGa = function () {
            console.log(GaService_1.initializeDelay);
          };
          GaService.initializeDelay = 1000;
          return GaService;
          var GaService_1;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Injectable } from '@disco3/core';
        import { Logger } from 'another-lib';
        var GaService = (function () {
          function GaService(logger) {
            this.logger = logger;
          }
          GaService_1 = GaService;
          GaService.prototype.initializeGa = function () {
            console.log(GaService_1.initializeDelay);
          };
          GaService.initializeDelay = 1000;
          GaService = GaService_1 = __decorate([
            Injectable(),
            __metadata("design:paramtypes", [Logger])
          ], GaService);
          return GaService;
          var GaService_1;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes only Angular decorators calls in __decorate', () => {
      const output = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Component } from '@disco3/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent()
          ], Clazz);
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Component } from '@disco3/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('recognizes tslib as well', () => {
      const input = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Component } from '@disco3/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz);
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          Clazz2 = __decorate([
            NotComponent(),
            Component({
              selector: 'app-root',
              templateUrl: './app.component.html',
              styleUrls: ['./app.component.css']
            })
          ], Clazz2);
          return Clazz2;
        }());
      `;
      const output = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Component } from '@disco3/core';
        import { NotComponent } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          Clazz = __decorate([
            NotComponent()
          ], Clazz);
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          Clazz2 = __decorate([
            NotComponent()
          ], Clazz2);
          return Clazz2;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('recognizes decorator imports in Angular core', () => {
      const input = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Injectable } from './di';
        var Console = /** @class */ (function () {
            function Console() {
            }
            Console.prototype.log = function (message) {
                console.log(message);
            };
            Console.prototype.warn = function (message) {
                console.warn(message);
            };
            Console = __decorate([
                Injectable()
            ], Console);
            return Console;
        }());
        export { Console };
      `;
      const output = tags.stripIndent`
        import { __decorate } from "tslib";
        import { Injectable } from './di';
        var Console = /** @class */ (function () {
            function Console() {
            }
            Console.prototype.log = function (message) {
                console.log(message);
            };
            Console.prototype.warn = function (message) {
                console.warn(message);
            };
            return Console;
        }());
        export { Console };
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transformCore(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes Angular decorators calls in __decorate when no __metadata is present', () => {
      const input = tags.stripIndent`
        import { __decorate } from 'tslib';
        import { Component, ElementRef, ContentChild} from '@disco3/core';

        var FooBarComponent = /** @class */ (function () {
            function FooBarComponent(elementRef) {
                this.elementRef = elementRef;
                this.inlineButtons = [];
                this.menuButtons = [];
            }
            FooBarComponent.ctorParameters = function () { return [
                { type: ElementRef }
            ]; };
            __decorate([
                ContentChild('heading', { read: ElementRef, static: true })
            ], FooBarComponent.prototype, "buttons", void 0);
            FooBarComponent = __decorate([
                Component({
                  selector: 'custom-foo-bar',
                  template: '',
                  styles: []
                })
            ], FooBarComponent);
            return FooBarComponent;
        }());
      `;

      const output = tags.stripIndent`
        import { __decorate } from 'tslib';
        import { Component, ElementRef, ContentChild } from '@disco3/core';

        var FooBarComponent = /** @class */ (function () {
          function FooBarComponent(elementRef) {
            this.elementRef = elementRef;
            this.inlineButtons = [];
            this.menuButtons = [];
          }

          return FooBarComponent;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transformCore(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes only Angular decorators calls in __decorate when no __metadata is present', () => {
      const input = tags.stripIndent`
        import { __decorate } from 'tslib';
        import { Component, ElementRef, ContentChild} from '@disco3/core';
        import { NotComponent } from 'another-lib';

        var FooBarComponent = /** @class */ (function () {
            function FooBarComponent(elementRef) {
                this.elementRef = elementRef;
                this.inlineButtons = [];
                this.menuButtons = [];
            }
            FooBarComponent.ctorParameters = function () { return [
                { type: ElementRef }
            ]; };
            __decorate([
                NotComponent(),
                ContentChild('heading', { read: ElementRef, static: true })
            ], FooBarComponent.prototype, "buttons", void 0);
            FooBarComponent = __decorate([
                NotComponent(),
                Component({
                  selector: 'custom-foo-bar',
                  template: '',
                  styles: []
                })
            ], FooBarComponent);
            return FooBarComponent;
        }());
      `;

      const output = tags.stripIndent`
        import { __decorate } from 'tslib';
        import { Component, ElementRef, ContentChild } from '@disco3/core';
        import { NotComponent } from 'another-lib';

        var FooBarComponent = /** @class */ (function () {
          function FooBarComponent(elementRef) {
            this.elementRef = elementRef;
            this.inlineButtons = [];
            this.menuButtons = [];
          }
          __decorate([
            NotComponent()
          ], FooBarComponent.prototype, "buttons", void 0);

          FooBarComponent = __decorate([ NotComponent() ], FooBarComponent); return FooBarComponent;
          }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transformCore(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('__metadata', () => {
    it('removes Angular decorators metadata', () => {
      const output = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input, Output, EventEmitter, HostListener } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() {
            this.change = new EventEmitter();
          }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input, Output, EventEmitter, HostListener } from '@disco3/core';
        import { NotInput } from 'another-lib';
        var Clazz = (function () {
          function Clazz() {
            this.change = new EventEmitter();
          }
          __decorate([
            Input(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "selected", void 0);
          __decorate([
              Output(),
              __metadata("design:type", Object)
          ], Clazz.prototype, "change", void 0);
          __decorate([
            HostListener('document:keydown.escape'),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
          ], Clazz.prototype, "onKeyDown", null);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes only Angular decorator metadata', () => {
      const output = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input } from '@disco3/core';
        import { NotInput } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          __decorate([
            NotInput(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "other", void 0);
          Clazz.prototype.myMethod = function () { return 'bar'; };
          __decorate([
            myDecorator(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
          ], MyClass.prototype, "myMethod", null);
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input } from '@disco3/core';
        import { NotInput } from 'another-lib';
        var Clazz = (function () {
          function Clazz() { }
          __decorate([
            Input(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "selected", void 0);
          __decorate([
            NotInput(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "other", void 0);
          Clazz.prototype.myMethod = function () { return 'bar'; };
          __decorate([
            myDecorator(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
          ], MyClass.prototype, "myMethod", null);
          return Clazz;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('recognizes tslib as well', () => {
      const input = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          __decorate([
            Input(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "selected", void 0);
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          __decorate([
            Input(),
            __metadata("design:type", Object)
          ], Clazz.prototype, "selected", void 0);
          return Clazz2;
        }());
      `;
      const output = tags.stripIndent`
        import { __decorate, __metadata } from "tslib";
        import { Input } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());

        var Clazz2 = (function () {
          function Clazz2() { }
          return Clazz2;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('__param', () => {
    it('removes all constructor parameters and their type metadata with only Angular decorators', () => {
      const output = tags.stripIndent`
        import { Component } from '@disco3/core';
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            return MyClass;
        }());
      `;
      const input = tags.stripIndent`
        import { Component } from '@disco3/core';
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            MyClass = __decorate([
              Component(),
                __param(0, Component()),
                __metadata("design:paramtypes", [Number])
            ], MyClass);
            return MyClass;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('keeps all constructor parameters and their type metadata with only custom decorators', () => {
      const output = tags.stripIndent`
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            MyClass = __decorate([
              myDecorator(),
              __param(0, myDecorator()),
              __metadata("design:paramtypes", [Number])
          ], MyClass);
            return MyClass;
        }());
        var MyOtherClass = /** @class */ (function () {
          function MyOtherClass(myParam) {
              this.myProp = 'bar';
          }
          MyOtherClass = __decorate([
            __metadata("design:paramtypes", [Number])
          ], MyOtherClass);
            return MyOtherClass;
        }());
      `;
      const input = tags.stripIndent`
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            MyClass = __decorate([
                myDecorator(),
                __param(0, myDecorator()),
                __metadata("design:paramtypes", [Number])
            ], MyClass);
            return MyClass;
        }());
        var MyOtherClass = /** @class */ (function () {
          function MyOtherClass(myParam) {
              this.myProp = 'bar';
          }
          MyOtherClass = __decorate([
            __metadata("design:paramtypes", [Number])
          ], MyOtherClass);
            return MyOtherClass;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('keeps all constructor parameters and their type metadata with custom & Angular decorators', () => {
      const output = tags.stripIndent`
        import { Component } from '@disco3/core';
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            MyClass = __decorate([
              myDecorator(),
              __param(0, myDecorator()),
              __metadata("design:paramtypes", [Number])
          ], MyClass);
            return MyClass;
        }());
      `;
      const input = tags.stripIndent`
        import { Component } from '@disco3/core';
        import { __decorate, __param, __metadata } from "tslib";
        var MyClass = /** @class */ (function () {
            function MyClass(myParam) {
                this.myProp = 'foo';
            }
            MyClass = __decorate([
                Component(),
                myDecorator(),
                __param(0, myDecorator()),
                __metadata("design:paramtypes", [Number])
            ], MyClass);
            return MyClass;
        }());
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('propDecorators', () => {
    it('removes top-level Angular propDecorators', () => {
      const output = tags.stripIndent`
        import { Input } from '@disco3/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] }
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested Angular propDecorators', () => {
      const output = tags.stripIndent`
        import { Input } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Input } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it("doesn't remove non Angular propDecorators", () => {
      const input = tags.stripIndent`
        import { Input } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = { 'ngIf': [{ type: Input }] };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${input}`);
    });

    it('leaves non-Angular propDecorators in mixed arrays', () => {
      const output = tags.stripIndent`
        import { Input } from '@disco3/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'notNgIf': [{ type: NotInput }]
        };
      `;
      const input = tags.stripIndent`
        import { Input } from '@disco3/core';
        import { NotInput } from 'another-lib';
        ${clazz}
        Clazz.propDecorators = {
          'ngIf': [{ type: Input }],
          'notNgIf': [{ type: NotInput }]
        };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('ctorParameters', () => {
    it('removes empty constructor parameters', () => {
      const output = tags.stripIndent`
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.ctorParameters = function () { return []; };
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes non-empty top-level style constructor parameters', () => {
      const output = tags.stripIndent`
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${clazz}
        Clazz.ctorParameters = function () { return [{type: Injector}]; };
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes top-level Angular constructor parameters in es2015', () => {
      const output = tags.stripIndent`
        class Clazz extends BaseClazz { constructor(e) { super(e); } }
      `;
      const input = tags.stripIndent`
        ${output}
        Clazz.ctorParameters = () => [ { type: Injectable } ];
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes nested constructor parameters', () => {
      const output = tags.stripIndent`
        import { Injector } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() { }
          return Clazz;
        }());
      `;
      const input = tags.stripIndent`
        import { Injector } from '@disco3/core';
        var Clazz = (function () {
          function Clazz() {}
          Clazz.ctorParameters = function () { return [{type: Injector}]; };
          return Clazz;
        }());
      `;

      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });

  describe('Ivy', () => {
    it('removes ɵsetClassMetadata call with pure annotation', () => {
      const output = tags.stripIndent`
        import { Component } from '@disco3/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        /*@__PURE__*/ (function () { i0.ɵsetClassMetadata(Clazz, [{
                type: Component,
                args: [{
                        selector: 'app-lazy',
                        template: 'very lazy',
                        styles: []
                    }]
            }], null, null); })();
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });

    it('removes ɵsetClassMetadata call', () => {
      const output = tags.stripIndent`
        import { Component } from '@disco3/core';
        ${clazz}
      `;
      const input = tags.stripIndent`
        ${output}
        (function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵsetClassMetadata(Clazz, [{
                type: Component,
                args: [{
                        selector: 'app-lazy',
                        template: 'very lazy',
                        styles: []
                    }]
            }], null, null); })();
      `;

      expect(testScrubFile(input)).toBeTruthy();
      expect(tags.oneLine`${transform(input)}`).toEqual(tags.oneLine`${output}`);
    });
  });
});
