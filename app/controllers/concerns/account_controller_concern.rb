# frozen_string_literal: true

module AccountControllerConcern
  extend ActiveSupport::Concern

  FOLLOW_PER_PAGE = 12

  included do
    layout 'public'
    before_action :set_account
    before_action :set_link_headers
    before_action :check_account_suspension
  end

  private

  def set_account
    username, domain = (params[:account_username] || '').split('@')
    @account = Account.find_by(username: username, domain: domain)
  end

  def set_link_headers
    response.headers['Link'] = LinkHeader.new(
      [
        webfinger_account_link,
        atom_account_url_link,
      ]
    )
  end

  def webfinger_account_link
    [
      webfinger_account_url,
      [%w(rel lrdd), %w(type application/xrd+xml)],
    ]
  end

  def atom_account_url_link
    [
      account_url(@account, format: 'atom'),
      [%w(rel alternate), %w(type application/atom+xml)],
    ]
  end

  def webfinger_account_url
    webfinger_url(resource: @account.to_webfinger_s)
  end

  def check_account_suspension
    gone if @account.suspended?
  end
end
