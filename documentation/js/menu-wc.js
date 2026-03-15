'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">Documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/DatabaseModule.html" data-type="entity-link" >DatabaseModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-DatabaseModule-71a8d2ac1e1e78f09b5d45fdd4656bd2ab32b25200fb0d33d9fe9f8b3c61dec7632b87f41760f7c80def25173d0b738e5fda877c63b4e3fa29b3d6a7678bbd9f"' : 'data-bs-target="#xs-injectables-links-module-DatabaseModule-71a8d2ac1e1e78f09b5d45fdd4656bd2ab32b25200fb0d33d9fe9f8b3c61dec7632b87f41760f7c80def25173d0b738e5fda877c63b4e3fa29b3d6a7678bbd9f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-DatabaseModule-71a8d2ac1e1e78f09b5d45fdd4656bd2ab32b25200fb0d33d9fe9f8b3c61dec7632b87f41760f7c80def25173d0b738e5fda877c63b4e3fa29b3d6a7678bbd9f"' :
                                        'id="xs-injectables-links-module-DatabaseModule-71a8d2ac1e1e78f09b5d45fdd4656bd2ab32b25200fb0d33d9fe9f8b3c61dec7632b87f41760f7c80def25173d0b738e5fda877c63b4e3fa29b3d6a7678bbd9f"' }>
                                        <li class="link">
                                            <a href="injectables/DatabaseHealthIndicator.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DatabaseHealthIndicator</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/DatabaseService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DatabaseService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/HealthModule.html" data-type="entity-link" >HealthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-HealthModule-a572b42a709247c81418f262a2a52eee2fafff29e976c7bb8c12bc7121eebf16f9005e11b1ca51418ad66551e13445f46ebef120363fb8b87de068da3c492fc8"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-a572b42a709247c81418f262a2a52eee2fafff29e976c7bb8c12bc7121eebf16f9005e11b1ca51418ad66551e13445f46ebef120363fb8b87de068da3c492fc8"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-a572b42a709247c81418f262a2a52eee2fafff29e976c7bb8c12bc7121eebf16f9005e11b1ca51418ad66551e13445f46ebef120363fb8b87de068da3c492fc8"' :
                                            'id="xs-controllers-links-module-HealthModule-a572b42a709247c81418f262a2a52eee2fafff29e976c7bb8c12bc7121eebf16f9005e11b1ca51418ad66551e13445f46ebef120363fb8b87de068da3c492fc8"' }>
                                            <li class="link">
                                                <a href="controllers/HealthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HealthController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/TemplatePlaygroundModule.html" data-type="entity-link" >TemplatePlaygroundModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' : 'data-bs-target="#xs-components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' :
                                            'id="xs-components-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                            <li class="link">
                                                <a href="components/TemplatePlaygroundComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TemplatePlaygroundComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' : 'data-bs-target="#xs-injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' :
                                        'id="xs-injectables-links-module-TemplatePlaygroundModule-a48e698b66bad8be9ff3b78b5db8e15ee6bb54bd2575fdb1bb61a34e76437cc54b2e161854c3d6c97b4c751d05ff3a43b70b87ceffd46d3c5bf53f6f161e3044"' }>
                                        <li class="link">
                                            <a href="injectables/HbsRenderService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HbsRenderService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/TemplateEditorService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TemplateEditorService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ZipExportService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ZipExportService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AllExceptionsFilter.html" data-type="entity-link" >AllExceptionsFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseDomainException.html" data-type="entity-link" >BaseDomainException</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseExceptionsFilter.html" data-type="entity-link" >BaseExceptionsFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseHttpException.html" data-type="entity-link" >BaseHttpException</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseWsException.html" data-type="entity-link" >BaseWsException</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseWsResponseDto.html" data-type="entity-link" >BaseWsResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotFoundDomainException.html" data-type="entity-link" >NotFoundDomainException</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotFoundHttpException.html" data-type="entity-link" >NotFoundHttpException</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotFoundWsException.html" data-type="entity-link" >NotFoundWsException</a>
                            </li>
                            <li class="link">
                                <a href="classes/ObjectWithMillisecondsTimestampDto.html" data-type="entity-link" >ObjectWithMillisecondsTimestampDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ResourceConflictHttpException.html" data-type="entity-link" >ResourceConflictHttpException</a>
                            </li>
                            <li class="link">
                                <a href="classes/UnknownErrorDomainException.html" data-type="entity-link" >UnknownErrorDomainException</a>
                            </li>
                            <li class="link">
                                <a href="classes/UnknownErrorHttpException.html" data-type="entity-link" >UnknownErrorHttpException</a>
                            </li>
                            <li class="link">
                                <a href="classes/UnknownErrorWsException.html" data-type="entity-link" >UnknownErrorWsException</a>
                            </li>
                            <li class="link">
                                <a href="classes/ValidationFailedHttpException.html" data-type="entity-link" >ValidationFailedHttpException</a>
                            </li>
                            <li class="link">
                                <a href="classes/ValidationFailedWsException.html" data-type="entity-link" >ValidationFailedWsException</a>
                            </li>
                            <li class="link">
                                <a href="classes/WsExceptionFilter.html" data-type="entity-link" >WsExceptionFilter</a>
                            </li>
                            <li class="link">
                                <a href="classes/WsRequestFailureDomainException.html" data-type="entity-link" >WsRequestFailureDomainException</a>
                            </li>
                            <li class="link">
                                <a href="classes/WsRequestTimeoutDomainException.html" data-type="entity-link" >WsRequestTimeoutDomainException</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/WsValidationPipe.html" data-type="entity-link" >WsValidationPipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AppConfig.html" data-type="entity-link" >AppConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseDomainExceptionOptions.html" data-type="entity-link" >BaseDomainExceptionOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseHttpExceptionOptions.html" data-type="entity-link" >BaseHttpExceptionOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseWsExceptionOptions.html" data-type="entity-link" >BaseWsExceptionOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CompoDocConfig.html" data-type="entity-link" >CompoDocConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DatabaseConfig.html" data-type="entity-link" >DatabaseConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DB.html" data-type="entity-link" >DB</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoggerConfig.html" data-type="entity-link" >LoggerConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RawBodyMiddlewareOptions.html" data-type="entity-link" >RawBodyMiddlewareOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RequestWithRawBody.html" data-type="entity-link" >RequestWithRawBody</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RunSeedProps.html" data-type="entity-link" >RunSeedProps</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SeedHistoryTable.html" data-type="entity-link" >SeedHistoryTable</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Session.html" data-type="entity-link" >Session</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Template.html" data-type="entity-link" >Template</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});