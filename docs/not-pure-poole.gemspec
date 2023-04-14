# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "JJCodo"
  spec.version       = "2.1.1"
  spec.authors       = ["JJ"]
  spec.email         = ["danielcoder@foxmail.com"]

  spec.summary       = "最幸福的事是睡到自然醒和躺下就能睡"
  spec.homepage      = "https://github.com/vszhub/not-pure-jekyll"
  spec.license       = "GPL"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README)!i) }

  spec.add_runtime_dependency "jekyll", "~> 3.9"
  spec.add_runtime_dependency "jekyll-feed", "~> 0.13"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.6"
  spec.add_runtime_dependency "jekyll-gist", "~> 1.5"
  spec.add_runtime_dependency "jekyll-paginate", "~> 1.1"
  spec.add_runtime_dependency "jekyll-sitemap", "~> 1.4"
  spec.add_runtime_dependency "kramdown-parser-gfm", "~> 1.1"

  spec.add_development_dependency "bundler", "~> 2.1"
  spec.add_development_dependency "rake", "~> 12.0"
end
