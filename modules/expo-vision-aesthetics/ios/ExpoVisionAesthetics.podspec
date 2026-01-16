Pod::Spec.new do |s|
  s.name           = 'ExpoVisionAesthetics'
  s.version        = '1.0.0'
  s.summary        = 'Native Vision Framework aesthetics scoring for Expo'
  s.description    = 'Uses iOS 18 Vision API for image aesthetic scoring with fallback for older versions'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.9',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
