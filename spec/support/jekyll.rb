# frozen_string_literal: true

require 'jekyll'

# Load the gems in the Gemfile's :jekyll_plugins group, exactly as the `jekyll`
# CLI does. Without this, plugins that are not also named in `_config.yml`'s
# `plugins:` list (e.g. jekyll-redirect-from, jemoji) are silently missing and
# the specs audit a different site than the one `bundle exec jekyll build`
# deploys.
Jekyll::PluginManager.require_from_bundler

# Tools to build / compile the Jekyll site and extract the sitemap
def site_config
  # TODO(template): We should standardize the build for specs
  # Consider simplifying baseurl
  # Consider forcing the desination folder
  # Override the local URL too? Would it break the sitemap?
  # Note: Config keys must be strings and thus use => style hashes.
  @site_config ||= Jekyll.configuration({ 'sass' => { 'quiet_deps' => true } })
end

def build_jekyll_site!
  @site = Jekyll::Site.new(site_config)
  @site.process
end

def load_sitemap
  # Ensure that you have called
  sitemap_text = File.read('_site/sitemap.xml')
  sitemap_links = sitemap_text.scan(%r{<loc>.+</loc>})
  sitemap_links.filter_map do |link|
    link = link.gsub("<loc>#{site_config['url']}", '').gsub('</loc>', '')
    # Skip non-html pages
    # (FUTURE?) Are there other pages that should be audited for accessibility?
    # (e.g. PDFs, documents. They'd need a different checker.)
    next unless link.end_with?('.html') || link.end_with?('/')

    link
  end.sort
end

# Start a local Rack server
# https://nts.strzibny.name/how-to-test-static-sites-with-rspec-capybara-and-webkit/
class StaticSite
  attr_reader :root, :server

  def initialize(root)
    @root = root
    @server = Rack::Files.new(root)
  end

  def call(env)
    # Remove the /baseurl prefix, which is present in all URLs, but not in the file system.
    path = "_site#{env['PATH_INFO'].gsub(site_config['baseurl'], '/')}"

    env['PATH_INFO'] = if path.end_with?('/') && exists?("#{path}index.html")
                         "#{path}index.html"
                       elsif !exists?(path) && exists?("#{path}.html")
                         "#{path}.html"
                       else
                         path
                       end

    server.call(env)
  end

  def exists?(path)
    File.exist?(File.join(root, path))
  end
end
