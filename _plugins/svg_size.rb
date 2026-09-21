# frozen_string_literal: true

# Give every inline <svg> explicit width/height attributes.
#
# The just-the-docs theme emits icons such as the search magnifying glass,
# the menu button, and heading anchors as <svg viewBox="..."> with no
# width/height. Until the stylesheet applies, browsers render such SVGs at
# the default 300x150 px, so the page briefly shows giant icons. Presentation
# attributes are applied by the parser itself, before any CSS, and the
# theme's CSS width/height rules still override them once loaded, so the
# styled result is unchanged.
#
# Sizes come from the viewBox (e.g. "0 0 24 24" -> 24x24). An <svg> with no
# viewBox is a hidden symbol sheet and gets 0x0.
module Jekyll
  # Adds width/height attributes to inline <svg> tags in rendered HTML.
  module SvgSize
    SVG_TAG = /<svg\b([^>]*)>/i
    VIEWBOX = /\bviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i

    def self.process(html)
      html.gsub(SVG_TAG) do |tag|
        attrs = Regexp.last_match(1)
        next tag if attrs =~ /\bwidth\s*=/i && attrs =~ /\bheight\s*=/i

        vb = attrs.match(VIEWBOX)
        w, h = vb ? [vb[1], vb[2]] : %w[0 0]
        w = w.sub(/\.0+\z/, '')
        h = h.sub(/\.0+\z/, '')
        "<svg width=\"#{w}\" height=\"#{h}\"#{attrs}>"
      end
    end
  end
end

Jekyll::Hooks.register [:pages, :documents], :post_render do |doc|
  next unless doc.output_ext == '.html' && doc.output

  doc.output = Jekyll::SvgSize.process(doc.output)
end
