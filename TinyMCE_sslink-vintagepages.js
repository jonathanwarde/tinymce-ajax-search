/* global tinymce, window */
import vintagesSelector from "./vintages-ajax-search";
import i18n from 'i18n';
import TinyMCEActionRegistrar from 'lib/TinyMCEActionRegistrar';
import React from 'react';
import ReactDOM from 'react-dom';
import jQuery from 'jquery';
import ShortcodeSerialiser from 'lib/ShortcodeSerialiser';
import {createInsertLinkModal} from 'containers/InsertLinkModal/InsertLinkModal';
import {loadComponent} from 'lib/Injector';

const commandName = 'sslinkvintagepages';

//console.log('TinyMCE_sslink-vintagepages.js loaded');

// Link to vintagepage
TinyMCEActionRegistrar
    .addAction('sslink', {
        text: i18n._t('Admin.LINKLABEL_VINTAGEPAGES', 'Link to a vintage page'),
        // eslint-disable-next-line no-console
        onclick: (editor) => editor.execCommand(commandName),
        priority: 51,
    })
    .addCommandWithUrlTest(commandName, /^\[vintagepage_link.+]$/);

const plugin = {
    init(editor) {
        //console.log('init sslinkvintagepages plugin');

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (document.querySelector('#Form_EditorVintagepageLink_Link')) {
                    vintagesSelector(editor);
                    observer.disconnect();
                }
            });
        });

        const startObserver = () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        };

        editor.addCommand(commandName, () => {
            const field = window.jQuery(`#${editor.id}`).entwine('ss');

            field.openvintagepageLinkDialog();
            startObserver();
        });

        // Note: this is key: the React component state will only pass through the typed value (ie. 'Rose wines').
        // This hook will replace the typed value with the selected ID that comes back from the vintages json controller
        editor.on('BeforeSetContent', function(e) {
            //console.log('VintagePages: BeforeSetContent:', e.content);
            if (window.vintagesSearchQuery && window.vintagesSelectedID) {
                const encodedSearchQuery = encodeURIComponent(window.vintagesSearchQuery);
                //console.log('VintagePages: BeforeSetContent search: ', encodedSearchQuery);
                const searchQueryPattern = window.vintagesSearchQuery.replace(/\s+/g, '(\\s|%20)+');
                const vintageShortCodeWithQuery = new RegExp(`\\[vintagepage_link,url='${searchQueryPattern}'\\]`, 'g');
                //console.log('VintagePages: BeforeSetContent: regEx', vintageShortCodeWithQuery);
                e.content = e.content.replaceAll(vintageShortCodeWithQuery, `[vintagepage_link,url='${window.vintagesSelectedID}']`);
            }
        });


        // What about when someone edits the link? We gotsta run that regEx again, but this time we have to access it via different hook
        editor.on('NodeChange', function(e) {
            //console.log('VintagePages: NodeChange:', e.element.dataset.mceHref);
            const selectedNode = e.element;

            //console.log('VintagePages: NodeChange: selected text?:', e.element.childNodes[0].textContent);
            if (selectedNode.nodeName === 'A' && selectedNode.classList.contains('vintagepage-link')) {
                //console.log('VintagePages: Selected a vintage page link:', selectedNode.getAttribute('href'));
                if (window.vintagesSearchQuery && window.vintagesSelectedID) {
                    const encodedSearchQuery = encodeURIComponent(window.vintagesSearchQuery);
                    const vintageShortCodeWithQuery = new RegExp(`\\[vintagepage_link,url='${encodedSearchQuery}'\\]`, 'g');
                    e.element.dataset.mceHref = e.element.dataset.mceHref.replace(vintageShortCodeWithQuery, `[vintagepage_link,url='${window.vintagesSelectedID}']`);
                }
            }
        });

    },
};

const modalId = 'insert-link__dialog-wrapper--vintagepage';
const sectionConfigKey = 'SilverStripe\\Admin\\LeftAndMain';
const formName = 'EditorVintagepageLink';

const InsertLinkVintagepageModal = loadComponent(createInsertLinkModal(sectionConfigKey, formName));

jQuery.entwine('ss', ($) => {
    $('textarea.htmleditor').entwine({
        openvintagepageLinkDialog() {
            let dialog = $(`#${modalId}`);
            if (!dialog.length) {
                dialog = $(`<div id="${modalId}" />`);
                $('body').append(dialog);
            }
            dialog.addClass('insert-link__dialog-wrapper');
            dialog.setElement(this);
            dialog.open();
        },
    });

    $(`#${modalId}`).entwine({
        renderModal(isOpen) {
            const handleHide = () => this.close();
            const handleInsert = (...args) => this.handleInsert(...args);
            const attrs = this.getOriginalAttributes();
            //console.log('attrs:', attrs);
            const selection = tinymce.activeEditor.selection;
            const selectionContent = selection.getContent() || '';
            const tagName = selection.getNode().tagName;
            const requireLinkText = tagName !== 'A' && selectionContent.trim() === '';

            // create/update the react component
            ReactDOM.render(
                <InsertLinkVintagepageModal
                    isOpen={isOpen}
                    onInsert={handleInsert}
                    onClosed={handleHide}
                    title={i18n._t('Admin.LINK_VINTAGEPAGE', 'Insert vintage page link')}
                    bodyClassName="modal__dialog"
                    className="insert-link__dialog-wrapper--vintagepage"
                    fileAttributes={attrs}
                    identifier="Admin.InsertLinkVintagepageModal"
                    requireLinkText={requireLinkText}
                />,
                this[0]
            );

        },

        buildAttributes(data) {

            const shortcode = ShortcodeSerialiser.serialise({
                name: 'vintagepage_link',
                properties: { url: data.Link },
            }, true);

            const href = data.Link && data.Link.length ? `[vintagepage_link,url='${data.Link}']` : '';
            let css_prefix = 'vintagepage';
            const css_class = css_prefix+'-link || js-'+css_prefix+'-link';

            return {
                href,
                title: data.Description,
                class: css_class,
            };
        },

        getOriginalAttributes() {
            const editor = this.getElement().getEditor();
            const node = $(editor.getSelectedNode());

            // Get href
            const hrefParts = (node.attr('href') || '').split('#');
            if (!hrefParts[0]) {
                return {};
            }

            const shortcode = ShortcodeSerialiser.match('vintagepage_link', false, hrefParts[0]);
            if (!shortcode) {
                return {};
            }

            return {
                Link: shortcode.properties.url ? shortcode.properties.url : '',
                Description: node.attr('title'),
            };
        },

    });
});

// Adds the plugin class to the list of available TinyMCE plugins
tinymce.PluginManager.add(commandName, (editor) => plugin.init(editor));
export default plugin;
