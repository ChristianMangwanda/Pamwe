Pod::Spec.new do |s|
  s.name           = 'PamweWidget'
  s.version        = '1.0.0'
  s.summary        = 'Shares the couple anniversary with the Lock Screen widget.'
  s.description    = 'Writes one date into the app group and reloads WidgetKit timelines.'
  s.author         = 'Pamwe'
  s.homepage       = 'https://pamwe.app'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
