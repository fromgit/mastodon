import React from 'react';
import DateTime from 'react-datetime';
import CharacterCounter from './character_counter';
import Button from '../../../components/button';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import Immutable from 'immutable';
import ReplyIndicatorContainer from '../containers/reply_indicator_container';
import AutosuggestTextarea from '../../../components/autosuggest_textarea';
import HashtagEditor from '../../../components/hashtag_editor';
import { debounce } from 'lodash';
import UploadButtonContainer from '../containers/upload_button_container';
import { defineMessages, injectIntl } from 'react-intl';
import Collapsable from '../../../components/collapsable';
import SpoilerButtonContainer from '../containers/spoiler_button_container';
import PrivacyDropdownContainer from '../containers/privacy_dropdown_container';
import SensitiveButtonContainer from '../containers/sensitive_button_container';
import SensitiveGuideContainer from '../containers/sensitive_guide_container';
import EmojiPickerDropdown from './emoji_picker_dropdown';
import TimeLimitDropdown from './time_limit_dropdown';
import UploadFormContainer from '../containers/upload_form_container';
import WarningContainer from '../containers/warning_container';
import { isMobile } from '../../../is_mobile';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { length } from 'stringz';
import { countableText } from '../util/counter';

// TODO: i18n
// Moment is used by react-datetime, which is imported only by this module.
// Fix the setting to ja for now because the default display is confusing for
// Japanese people.
import 'moment/locale/ja';

const messages = defineMessages({
  placeholder: { id: 'compose_form.placeholder', defaultMessage: 'What is on your mind?' },
  spoiler_placeholder: { id: 'compose_form.spoiler_placeholder', defaultMessage: 'Write your warning here' },
  schedule_placeholder: { id: 'compose_form.schedule_placeholder', defaultMessage: 'Time to post' },
  hashtag_editor_placeholder: { id: 'compose_form.hashtag_editor_placeholder', defaultMessage: 'Append tag (press enter to add)' },
  publish: { id: 'compose_form.publish', defaultMessage: 'Toot' },
  publishLoud: { id: 'compose_form.publish_loud', defaultMessage: '{publish}!' },
});

@injectIntl
export default class ComposeForm extends ImmutablePureComponent {

  static propTypes = {
    scheduling: PropTypes.bool,
    intl: PropTypes.object.isRequired,
    text: PropTypes.string.isRequired,
    published: PropTypes.any,
    suggestion_token: PropTypes.string,
    suggestions: ImmutablePropTypes.list,
    spoiler: PropTypes.bool,
    privacy: PropTypes.string,
    spoiler_text: PropTypes.string,
    focusDate: PropTypes.instanceOf(Date),
    preselectDate: PropTypes.instanceOf(Date),
    is_submitting: PropTypes.bool,
    is_uploading: PropTypes.bool,
    me: PropTypes.number,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onClearSuggestions: PropTypes.func.isRequired,
    onFetchSuggestions: PropTypes.func.isRequired,
    onSuggestionSelected: PropTypes.func.isRequired,
    onChangeDateTime: PropTypes.func.isRequired,
    onChangeSpoilerText: PropTypes.func.isRequired,
    onPaste: PropTypes.func.isRequired,
    onPickEmoji: PropTypes.func.isRequired,
    showSearch: PropTypes.bool,
    hash_tag_suggestions: ImmutablePropTypes.list,
    hash_tag_token: PropTypes.string,
    onHashTagSuggestionsClearRequested: PropTypes.func.isRequired,
    onHashTagSuggestionsFetchRequested: PropTypes.func.isRequired,
    onHashTagSuggestionsSelected: PropTypes.func.isRequired,
    onSelectTimeLimit: PropTypes.func.isRequired,
    onInsertHashtag: PropTypes.func.isRequired,
  };

  static defaultProps = {
    showSearch: false,
  };

  state = { tagSuggestionFrom: null }
  _restoreCaret = null;

  handleChange = (e) => {
    this.props.onChange(e.target.value);
  }

  handleKeyDown = (e) => {
    if (e.keyCode === 13 && (e.ctrlKey || e.metaKey)) {
      this.handleSubmit();
    }
  }

  handleSubmit = () => {
    if (this.props.text !== this.autosuggestTextarea.textarea.value) {
      // Something changed the text inside the textarea (e.g. browser extensions like Grammarly)
      // Update the state to match the current text
      this.props.onChange(this.autosuggestTextarea.textarea.value);
    }

    if (!this.props.scheduling || this.props.published !== null) {
      this.props.onSubmit();
    }
  }

  onSuggestionsClearRequested = () => {
    this.props.onClearSuggestions();
  }

  onSuggestionsFetchRequested = debounce((token) => {
    this.props.onFetchSuggestions(token);
  }, 500, { trailing: true })

  onSuggestionSelected = (tokenStart, token, value) => {
    this._restoreCaret = 'suggestion';
    this.props.onSuggestionSelected(tokenStart, token, value);
  }

  onHashTagSuggestionsClearRequested = () => {
    this.props.onHashTagSuggestionsClearRequested();
    this.setState({ tagSuggestionFrom: null });
  }

  onHashTagSuggestionsFetchRequested = (token, tagSuggestionFrom) => {
    this.props.onHashTagSuggestionsFetchRequested(token);
    this.setState({ tagSuggestionFrom });
  }

  onHashTagSuggestionsSelected = (tokenStart, token, value) => {
    this._restoreCaret = 'suggestion';
    this.props.onHashTagSuggestionsSelected(tokenStart, token, value);
    this.setState({ tagSuggestionFrom: null });
  }

  handleChangeSpoilerText = (e) => {
    this.props.onChangeSpoilerText(e.target.value);
  }

  componentWillReceiveProps (nextProps) {
    // If this is the update where we've finished uploading,
    // save the last caret position so we can restore it below!
    if ((!nextProps.is_uploading && this.props.is_uploading) || this._restoreCaret === null) {
      this._restoreCaret = this.autosuggestTextarea.textarea.selectionStart;
    } else if (this._restoreCaret === 'suggestion') {
      const diff = nextProps.text.length - this.props.text.length;
      this._restoreCaret = this.autosuggestTextarea.textarea.selectionStart + diff;
    }
  }

  componentDidUpdate (prevProps) {
    // This statement does several things:
    // - If we're beginning a reply, and,
    //     - Replying to zero or one users, places the cursor at the end of the textbox.
    //     - Replying to more than one user, selects any usernames past the first;
    //       this provides a convenient shortcut to drop everyone else from the conversation.
    // - If we've just finished uploading an image, and have a saved caret position,
    //   restores the cursor to that position after the text changes!
    if (this.props.focusDate !== prevProps.focusDate || (prevProps.is_uploading && !this.props.is_uploading && typeof this._restoreCaret === 'number')) {
      let selectionEnd, selectionStart;

      if (this.props.preselectDate !== prevProps.preselectDate) {
        selectionEnd   = this.props.text.length;
        selectionStart = this.props.text.search(/\s/) + 1;
      } else if (typeof this._restoreCaret === 'number') {
        selectionStart = this._restoreCaret;
        selectionEnd   = this._restoreCaret;
      } else {
        selectionEnd   = this.props.text.length;
        selectionStart = selectionEnd;
      }

      this.autosuggestTextarea.textarea.setSelectionRange(selectionStart, selectionEnd);
      this.autosuggestTextarea.textarea.focus();
    } else if(prevProps.is_submitting && !this.props.is_submitting) {
      this.autosuggestTextarea.textarea.focus();
    }
    this._restoreCaret = null;
  }

  setAutosuggestTextarea = (c) => {
    this.autosuggestTextarea = c;
  }

  handleEmojiPick = (data) => {
    const position     = this.autosuggestTextarea.textarea.selectionStart;
    const emojiChar    = data.unicode.split('-').map(code => String.fromCodePoint(parseInt(code, 16))).join('');
    this._restoreCaret = position + emojiChar.length + 1;
    this.props.onPickEmoji(position, data);
  }

  handleSelectTimeLimit = (data) => {
    this._restoreCaret = this.autosuggestTextarea.textarea.selectionStart;
    this.props.onSelectTimeLimit(data);
  }

  render () {
    const { scheduling, intl, onPaste, showSearch } = this.props;
    const { tagSuggestionFrom } = this.state;
    const disabled = this.props.is_submitting;
    const text     = [this.props.spoiler_text, countableText(this.props.text)].join('');

    let publishText = '';

    if (this.props.privacy === 'private' || this.props.privacy === 'direct') {
      publishText = <span className='compose-form__publish-private'><i className='fa fa-lock' /> {intl.formatMessage(messages.publish)}</span>;
    } else {
      publishText = this.props.privacy !== 'unlisted' ? intl.formatMessage(messages.publishLoud, { publish: intl.formatMessage(messages.publish) }) : intl.formatMessage(messages.publish);
    }

    return (
      <div className='compose-form'>
        <Collapsable isVisible={this.props.spoiler} fullHeight={50}>
          <div className='spoiler-input'>
            <label>
              <span style={{ display: 'none' }}>{intl.formatMessage(messages.spoiler_placeholder)}</span>
              <input placeholder={intl.formatMessage(messages.spoiler_placeholder)} value={this.props.spoiler_text} onChange={this.handleChangeSpoilerText} onKeyDown={this.handleKeyDown} type='text' className='spoiler-input__input'  id='cw-spoiler-input' />
            </label>
          </div>
        </Collapsable>

        <WarningContainer />

        <ReplyIndicatorContainer />

        <div className='compose-form__autosuggest-wrapper'>
          <AutosuggestTextarea
            ref={this.setAutosuggestTextarea}
            placeholder={intl.formatMessage(messages.placeholder)}
            disabled={disabled}
            value={this.props.text}
            onChange={this.handleChange}
            suggestions={this.props.suggestions}
            onKeyDown={this.handleKeyDown}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            onSuggestionSelected={this.onSuggestionSelected}
            onPaste={onPaste}
            autoFocus={!showSearch && !isMobile(window.innerWidth)}
            hash_tag_suggestions={tagSuggestionFrom === 'autosuggested-textarea' ? this.props.hash_tag_suggestions : Immutable.List()}
            onHashTagSuggestionsFetchRequested={this.onHashTagSuggestionsFetchRequested}
            onHashTagSuggestionsClearRequested={this.onHashTagSuggestionsClearRequested}
            onHashTagSuggestionsSelected={this.onHashTagSuggestionsSelected}
          />

          <EmojiPickerDropdown onPickEmoji={this.handleEmojiPick} />
          <TimeLimitDropdown onSelectTimeLimit={this.handleSelectTimeLimit} />
        </div>

        <div className='compose-form__modifiers'>
          <UploadFormContainer />
          <HashtagEditor
            placeholder={intl.formatMessage(messages.hashtag_editor_placeholder)}
            disabled={disabled}
            suggestions={tagSuggestionFrom === 'hashtag-editor' ? this.props.hash_tag_suggestions : Immutable.List()}
            onSuggestionsFetchRequested={this.onHashTagSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onHashTagSuggestionsClearRequested}
            onInsertHashtag={this.props.onInsertHashtag}
          />
        </div>

        <div className='compose-form__buttons-wrapper'>
          <div className='compose-form__buttons'>
            <UploadButtonContainer />
            <PrivacyDropdownContainer />
            <SensitiveButtonContainer />
            <SpoilerButtonContainer />
          </div>

          {
            scheduling && (
              <DateTime
                className='compose-form__datetime'
                inputProps={{
                  className: 'compose-form__datetime-input',
                  placeholder: intl.formatMessage(messages.schedule_placeholder),
                }}
                onChange={this.props.onChangeDateTime}
                value={this.props.published}
              />
            )
          }

          <div className='compose-form__publish'>
            <div className='character-counter__wrapper'><CharacterCounter max={500} text={text} /></div>
            <div className='compose-form__publish-button-wrapper'><Button text={publishText} onClick={this.handleSubmit} disabled={disabled || this.props.is_uploading || typeof this.props.published === 'string' || length(text) > 500 || (text.length !== 0 && text.trim().length === 0)} block /></div>
          </div>
        </div>

        <SensitiveGuideContainer />
      </div>
    );
  }

}
