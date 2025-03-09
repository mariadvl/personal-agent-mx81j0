import 'cypress';

// Default settings for testing
const defaultSettings = {
  voice_settings: {
    enabled: false,
    voice_id: 'default',
    speech_rate: 1.0
  },
  personality_settings: {
    name: 'Assistant',
    style: 'helpful',
    formality: 'neutral',
    verbosity: 'balanced'
  },
  privacy_settings: {
    local_storage_only: true,
    analytics_enabled: false,
    error_reporting: false,
    allow_web_search: false
  },
  storage_settings: {
    base_path: 'data',
    backup_enabled: false,
    backup_frequency: 'weekly',
    backup_count: 5
  },
  llm_settings: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 1000,
    use_local_llm: false,
    local_model_path: ''
  },
  api_keys: {
    openai_api_key: 'sk-***************************',
    elevenlabs_api_key: '***************************',
    serpapi_key: '***************************'
  },
  search_settings: {
    enabled: true,
    provider: 'duckduckgo',
    max_results: 5
  },
  memory_settings: {
    vector_db_path: 'memory/vectors',
    max_memory_items: 10000,
    context_window_size: 10
  }
};

// Updated settings for testing
const updatedSettings = {
  voice_settings: {
    enabled: true,
    voice_id: 'friendly',
    speech_rate: 1.2
  },
  personality_settings: {
    name: 'Personal Assistant',
    style: 'friendly',
    formality: 'casual',
    verbosity: 'detailed'
  },
  privacy_settings: {
    local_storage_only: false,
    analytics_enabled: true,
    error_reporting: true,
    allow_web_search: true
  },
  storage_settings: {
    base_path: 'custom/data',
    backup_enabled: true,
    backup_frequency: 'daily',
    backup_count: 10
  },
  llm_settings: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.8,
    max_tokens: 2000,
    use_local_llm: true,
    local_model_path: '/path/to/model'
  },
  api_keys: {
    openai_api_key: 'sk-***************************',
    elevenlabs_api_key: '***************************',
    serpapi_key: '***************************'
  },
  search_settings: {
    enabled: true,
    provider: 'serpapi',
    max_results: 10
  },
  memory_settings: {
    vector_db_path: 'memory/vectors',
    max_memory_items: 20000,
    context_window_size: 20
  }
};

describe('Settings Navigation', () => {
  beforeEach(() => {
    // Login and set up test environment
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
  });

  it('should display settings page with default tab', () => {
    cy.get('[data-testid=settings-panel]').should('be.visible');
    cy.get('[data-testid=tab-voice]').should('have.class', 'active');
    cy.get('[data-testid=voice-settings]').should('be.visible');
  });

  it('should navigate between settings tabs', () => {
    cy.get('[data-testid=tab-personality]').click();
    cy.get('[data-testid=personality-settings]').should('be.visible');
    
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=privacy-settings]').should('be.visible');
    
    cy.get('[data-testid=tab-storage]').click();
    cy.get('[data-testid=storage-settings]').should('be.visible');
    
    cy.get('[data-testid=tab-api]').click();
    cy.get('[data-testid=api-settings]').should('be.visible');
    
    cy.get('[data-testid=tab-advanced]').click();
    cy.get('[data-testid=advanced-settings]').should('be.visible');
    
    cy.get('[data-testid=tab-data]').click();
    cy.get('[data-testid=data-management]').should('be.visible');
  });

  it('should maintain tab selection on page refresh', () => {
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=privacy-settings]').should('be.visible');
    
    cy.reload();
    cy.mockSettingsResponse(defaultSettings);
    cy.get('[data-testid=tab-privacy]').should('have.class', 'active');
    cy.get('[data-testid=privacy-settings]').should('be.visible');
  });
});

describe('Voice Settings', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should display current voice settings', () => {
    const voiceSettings = {
      ...defaultSettings,
      voice_settings: {
        enabled: true,
        voice_id: 'friendly',
        speech_rate: 1.2
      }
    };
    cy.mockSettingsResponse(voiceSettings);
    cy.visit('/settings');
    
    cy.get('[data-testid=voice-enabled-toggle]').should('be.checked');
    cy.get('[data-testid=voice-selector]').should('have.value', 'friendly');
    cy.get('[data-testid=speech-rate-slider]').should('have.value', '1.2');
  });

  it('should update voice settings', () => {
    cy.visit('/settings');
    cy.mockSettingsResponse(defaultSettings);
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=voice-enabled-toggle]').click();
    cy.get('[data-testid=voice-selector]').select('friendly');
    cy.get('[data-testid=speech-rate-slider]').invoke('val', 1.2).trigger('change');
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.voice_settings.enabled).to.be.true;
      expect(interception.request.body.voice_settings.voice_id).to.equal('friendly');
      expect(interception.request.body.voice_settings.speech_rate).to.equal(1.2);
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should test voice sample', () => {
    cy.visit('/settings');
    cy.mockSettingsResponse({
      ...defaultSettings,
      voice_settings: {
        enabled: true,
        voice_id: 'friendly',
        speech_rate: 1.0
      }
    });
    
    cy.mockVoiceSynthesis({ audio_url: 'data:audio/mp3;base64,...' });
    
    cy.get('[data-testid=test-voice-button]').click();
    
    cy.wait('@voiceSynthesis').then((interception) => {
      expect(interception.request.body.voice_id).to.equal('friendly');
      expect(interception.request.body.text).to.exist;
    });
    
    cy.get('[data-testid=audio-player]').should('be.visible');
    cy.get('[data-testid=audio-player]').should('have.attr', 'src').and('include', 'data:audio/mp3;base64');
  });

  it('should handle voice settings update errors', () => {
    cy.visit('/settings');
    cy.mockSettingsResponse(defaultSettings);
    cy.mockSettingsUpdate({ success: false, error: 'Failed to update voice settings' });
    
    cy.get('[data-testid=voice-enabled-toggle]').click();
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.get('[data-testid=error-notification]').should('be.visible').and('contain', 'Failed to update');
    cy.get('[data-testid=error-notification]').find('button').should('be.visible');
  });
});

describe('Personality Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-personality]').click();
  });

  it('should display current personality settings', () => {
    const personalitySettings = {
      ...defaultSettings,
      personality_settings: {
        name: 'Personal Assistant',
        style: 'friendly',
        formality: 'casual',
        verbosity: 'detailed'
      }
    };
    cy.mockSettingsResponse(personalitySettings);
    cy.reload();
    
    cy.get('[data-testid=personality-name-input]').should('have.value', 'Personal Assistant');
    cy.get('[data-testid=personality-style-selector]').should('have.value', 'friendly');
    cy.get('[data-testid=formality-slider]').should('have.value', 'casual');
    cy.get('[data-testid=verbosity-slider]').should('have.value', 'detailed');
  });

  it('should update personality settings', () => {
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=personality-name-input]').clear().type('Personal Assistant');
    cy.get('[data-testid=personality-style-selector]').select('friendly');
    cy.get('[data-testid=formality-slider]').invoke('val', 'casual').trigger('change');
    cy.get('[data-testid=verbosity-slider]').invoke('val', 'detailed').trigger('change');
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.personality_settings.name).to.equal('Personal Assistant');
      expect(interception.request.body.personality_settings.style).to.equal('friendly');
      expect(interception.request.body.personality_settings.formality).to.equal('casual');
      expect(interception.request.body.personality_settings.verbosity).to.equal('detailed');
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should show personality style descriptions', () => {
    cy.get('[data-testid=personality-style-selector]').click();
    
    cy.get('[data-testid=personality-style-selector]').find('option').each(($option) => {
      const optionValue = $option.val();
      cy.get(`[data-testid=style-description-${optionValue}]`).should('exist');
    });
    
    cy.get('[data-testid=personality-style-selector]').select('friendly');
    cy.get('[data-testid=style-description-friendly]').should('be.visible');
  });
});

describe('Privacy Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-privacy]').click();
  });

  it('should display current privacy settings', () => {
    const privacySettings = {
      ...defaultSettings,
      privacy_settings: {
        local_storage_only: false,
        analytics_enabled: true,
        error_reporting: true,
        allow_web_search: true
      }
    };
    cy.mockSettingsResponse(privacySettings);
    cy.reload();
    
    cy.get('[data-testid=local-storage-toggle]').should('not.be.checked');
    cy.get('[data-testid=analytics-toggle]').should('be.checked');
    cy.get('[data-testid=error-reporting-toggle]').should('be.checked');
    cy.get('[data-testid=web-search-toggle]').should('be.checked');
  });

  it('should update privacy settings', () => {
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=local-storage-toggle]').click();
    cy.get('[data-testid=analytics-toggle]').click();
    cy.get('[data-testid=error-reporting-toggle]').click();
    cy.get('[data-testid=web-search-toggle]').click();
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.privacy_settings.local_storage_only).to.be.false;
      expect(interception.request.body.privacy_settings.analytics_enabled).to.be.true;
      expect(interception.request.body.privacy_settings.error_reporting).to.be.true;
      expect(interception.request.body.privacy_settings.allow_web_search).to.be.true;
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should show warning for cloud features', () => {
    cy.get('[data-testid=local-storage-toggle]').click();
    
    cy.get('[data-testid=warning-indicator]').should('be.visible');
    cy.get('[data-testid=confirm-dialog]').should('be.visible');
    
    cy.get('[data-testid=confirm-button]').click();
    cy.get('[data-testid=local-storage-toggle]').should('not.be.checked');
  });

  it('should show external service indicators', () => {
    cy.get('[data-testid=web-search-toggle]').parent().find('[data-testid=warning-indicator]').should('exist');
    cy.get('[data-testid=web-search-toggle]').parent().find('[data-testid=warning-indicator]').trigger('mouseover');
    cy.get('.tooltip').should('be.visible').and('contain', 'data sharing');
  });
});

describe('Storage Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-storage]').click();
  });

  it('should display current storage settings', () => {
    const storageSettings = {
      ...defaultSettings,
      storage_settings: {
        base_path: 'custom/data',
        backup_enabled: true,
        backup_frequency: 'daily',
        backup_count: 10
      }
    };
    cy.mockSettingsResponse(storageSettings);
    cy.reload();
    
    cy.get('[data-testid=storage-path-input]').should('have.value', 'custom/data');
    cy.get('[data-testid=backup-enabled-toggle]').should('be.checked');
    cy.get('[data-testid=backup-frequency-selector]').should('have.value', 'daily');
    cy.get('[data-testid=backup-count-input]').should('have.value', '10');
  });

  it('should update storage settings', () => {
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=storage-path-input]').clear().type('custom/data');
    cy.get('[data-testid=backup-enabled-toggle]').click();
    cy.get('[data-testid=backup-frequency-selector]').select('daily');
    cy.get('[data-testid=backup-count-input]').clear().type('10');
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.storage_settings.base_path).to.equal('custom/data');
      expect(interception.request.body.storage_settings.backup_enabled).to.be.true;
      expect(interception.request.body.storage_settings.backup_frequency).to.equal('daily');
      expect(interception.request.body.storage_settings.backup_count).to.equal(10);
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should display storage usage statistics', () => {
    cy.mockStorageStats({
      database_size: 15.6,
      vector_db_size: 45.2,
      file_storage: 120.8,
      total_used: 181.6,
      available: 10240,
      unit: 'MB'
    });
    
    cy.get('[data-testid=storage-stats-button]').click();
    
    cy.get('[data-testid=database-size]').should('contain', '15.6 MB');
    cy.get('[data-testid=vector-db-size]').should('contain', '45.2 MB');
    cy.get('[data-testid=file-storage]').should('contain', '120.8 MB');
    cy.get('[data-testid=total-storage]').should('contain', '181.6 MB');
    cy.get('[data-testid=available-storage]').should('contain', '10240 MB');
  });

  it('should trigger manual backup', () => {
    cy.mockBackupCreate({
      backup_id: 'backup-2023-06-15-120000',
      created_at: '2023-06-15T12:00:00Z',
      size: 45.6,
      unit: 'MB',
      location: 'data/backups/backup-2023-06-15-120000.zip'
    });
    
    cy.get('[data-testid=create-backup-button]').click();
    
    cy.wait('@backupCreate');
    cy.get('[data-testid=progress-indicator]').should('be.visible');
    cy.get('[data-testid=success-notification]').should('be.visible').and('contain', 'Backup created');
    cy.get('[data-testid=backup-history]').should('contain', 'backup-2023-06-15-120000');
  });
});

describe('API Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-api]').click();
  });

  it('should display current API settings', () => {
    const apiSettings = {
      ...defaultSettings,
      api_keys: {
        openai_api_key: 'sk-***************************',
        elevenlabs_api_key: '***************************',
        serpapi_key: '***************************'
      }
    };
    cy.mockSettingsResponse(apiSettings);
    cy.reload();
    
    cy.get('[data-testid=openai-api-key-input]').should('have.value', 'sk-***************************');
    cy.get('[data-testid=elevenlabs-api-key-input]').should('have.value', '***************************');
    cy.get('[data-testid=serpapi-key-input]').should('have.value', '***************************');
  });

  it('should update API keys', () => {
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=openai-api-key-input]').clear().type('sk-newopenaikey');
    cy.get('[data-testid=elevenlabs-api-key-input]').clear().type('new-elevenlabs-key');
    cy.get('[data-testid=serpapi-key-input]').clear().type('new-serpapi-key');
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.api_keys.openai_api_key).to.equal('sk-newopenaikey');
      expect(interception.request.body.api_keys.elevenlabs_api_key).to.equal('new-elevenlabs-key');
      expect(interception.request.body.api_keys.serpapi_key).to.equal('new-serpapi-key');
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should validate API keys', () => {
    cy.mockApiValidation('openai', false, { error: 'Invalid API key' });
    
    cy.get('[data-testid=openai-api-key-input]').clear().type('sk-invalidkey');
    cy.get('[data-testid=test-api-key-button]').eq(0).click();
    
    cy.get('[data-testid=error-notification]').should('be.visible').and('contain', 'Invalid API key');
    
    cy.mockApiValidation('openai', true, { 
      models: ['gpt-4o', 'gpt-3.5-turbo'], 
      usage: { current: 5.23, limit: 100 } 
    });
    
    cy.get('[data-testid=openai-api-key-input]').clear().type('sk-validkey');
    cy.get('[data-testid=test-api-key-button]').eq(0).click();
    
    cy.get('[data-testid=success-notification]').should('be.visible').and('contain', 'API key is valid');
  });

  it('should show API usage statistics', () => {
    cy.mockApiValidation('openai', true, { 
      models: ['gpt-4o', 'gpt-3.5-turbo'], 
      usage: { current: 5.23, limit: 100 } 
    });
    
    cy.mockApiValidation('elevenlabs', true, { 
      voices: ['friendly', 'professional'], 
      usage: { current: 35, limit: 100 } 
    });
    
    cy.mockApiValidation('serpapi', true, { 
      usage: { current: 25, limit: 100 } 
    });
    
    cy.get('[data-testid=test-api-key-button]').eq(0).click();
    cy.get('[data-testid=test-api-key-button]').eq(1).click();
    cy.get('[data-testid=test-api-key-button]').eq(2).click();
    
    cy.get('[data-testid=openai-usage]').should('contain', '5.23/100');
    cy.get('[data-testid=elevenlabs-usage]').should('contain', '35/100');
    cy.get('[data-testid=serpapi-usage]').should('contain', '25/100');
    
    cy.get('[data-testid=openai-usage-bar]').should('have.attr', 'style').and('include', 'width: 5.23%');
    cy.get('[data-testid=elevenlabs-usage-bar]').should('have.attr', 'style').and('include', 'width: 35%');
    cy.get('[data-testid=serpapi-usage-bar]').should('have.attr', 'style').and('include', 'width: 25%');
  });
});

describe('Advanced Settings', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-advanced]').click();
  });

  it('should display current advanced settings', () => {
    const advancedSettings = {
      ...defaultSettings,
      llm_settings: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.8,
        max_tokens: 2000,
        use_local_llm: true,
        local_model_path: '/path/to/model'
      }
    };
    cy.mockSettingsResponse(advancedSettings);
    cy.reload();
    
    cy.get('[data-testid=llm-provider-selector]').should('have.value', 'openai');
    cy.get('[data-testid=model-selector]').should('have.value', 'gpt-4o');
    cy.get('[data-testid=temperature-slider]').should('have.value', '0.8');
    cy.get('[data-testid=max-tokens-input]').should('have.value', '2000');
    cy.get('[data-testid=local-llm-toggle]').should('be.checked');
    cy.get('[data-testid=local-model-path-input]').should('have.value', '/path/to/model');
  });

  it('should update advanced settings', () => {
    cy.mockSettingsUpdate({ success: true, settings: updatedSettings });
    
    cy.get('[data-testid=llm-provider-selector]').select('openai');
    cy.get('[data-testid=model-selector]').select('gpt-4o');
    cy.get('[data-testid=temperature-slider]').invoke('val', 0.8).trigger('change');
    cy.get('[data-testid=max-tokens-input]').clear().type('2000');
    cy.get('[data-testid=local-llm-toggle]').click();
    cy.get('[data-testid=local-model-path-input]').should('be.visible').type('/path/to/model');
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.llm_settings.provider).to.equal('openai');
      expect(interception.request.body.llm_settings.model).to.equal('gpt-4o');
      expect(interception.request.body.llm_settings.temperature).to.equal(0.8);
      expect(interception.request.body.llm_settings.max_tokens).to.equal(2000);
      expect(interception.request.body.llm_settings.use_local_llm).to.be.true;
      expect(interception.request.body.llm_settings.local_model_path).to.equal('/path/to/model');
    });
    
    cy.get('[data-testid=success-notification]').should('be.visible');
  });

  it('should show model-specific options', () => {
    cy.get('[data-testid=llm-provider-selector]').select('openai');
    cy.get('[data-testid=model-selector]').find('option').should('include.text', 'gpt-4o');
    
    cy.get('[data-testid=llm-provider-selector]').select('anthropic');
    cy.get('[data-testid=model-selector]').find('option').should('include.text', 'claude-3');
  });

  it('should validate local model path', () => {
    cy.get('[data-testid=local-llm-toggle]').click();
    cy.get('[data-testid=local-model-path-input]').clear().type('invalid/path');
    
    cy.mockSettingsUpdate({ 
      success: false, 
      error: 'Invalid model path: File not found'
    });
    
    cy.get('[data-testid=save-settings-button]').click();
    cy.get('[data-testid=error-notification]').should('be.visible').and('contain', 'Invalid model path');
    
    cy.get('[data-testid=local-model-path-input]').clear().type('/valid/path/to/model');
    
    cy.mockSettingsUpdate({ success: true, settings: {
      ...updatedSettings,
      llm_settings: {
        ...updatedSettings.llm_settings,
        local_model_path: '/valid/path/to/model'
      }
    }});
    
    cy.get('[data-testid=save-settings-button]').click();
    cy.get('[data-testid=success-notification]').should('be.visible');
  });
});

describe('Data Management', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
    cy.visit('/settings');
    cy.get('[data-testid=tab-data]').click();
  });

  it('should export all data', () => {
    cy.mockDataExport({
      export_id: 'export-2023-06-15-120000',
      created_at: '2023-06-15T12:00:00Z',
      size: 25.3,
      unit: 'MB',
      download_url: '/api/settings/export/download/export-2023-06-15-120000'
    });
    
    cy.get('[data-testid=export-data-button]').click();
    
    cy.wait('@dataExport');
    cy.get('[data-testid=progress-indicator]').should('be.visible');
    cy.get('[data-testid=success-notification]').should('be.visible');
    
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    
    cy.get('[data-testid=download-export-button]').click();
    cy.get('@windowOpen').should('be.calledWith', '/api/settings/export/download/export-2023-06-15-120000');
  });

  it('should import data', () => {
    cy.mockDataImport({
      success: true,
      imported_items: {
        conversations: 15,
        memories: 256,
        documents: 8,
        settings: true
      }
    });
    
    cy.get('[data-testid=import-data-button]').attachFile('export-file.zip');
    
    cy.wait('@dataImport');
    cy.get('[data-testid=progress-indicator]').should('be.visible');
    
    cy.get('[data-testid=success-notification]').should('be.visible')
      .and('contain', '15 conversations')
      .and('contain', '256 memories')
      .and('contain', '8 documents');
  });

  it('should delete all data', () => {
    cy.mockDataDelete({
      success: true,
      deleted_items: {
        conversations: 15,
        memories: 256,
        documents: 8,
        settings: true
      }
    });
    
    cy.get('[data-testid=delete-all-data-button]').click();
    
    cy.get('[data-testid=confirm-dialog]').should('be.visible')
      .and('contain', 'permanently delete');
    
    cy.get('[data-testid=confirm-input]').type('DELETE');
    cy.get('[data-testid=confirm-button]').click();
    
    cy.wait('@dataDelete');
    
    cy.get('[data-testid=success-notification]').should('be.visible')
      .and('contain', 'successfully deleted');
  });

  it('should optimize database', () => {
    cy.mockDatabaseOptimize({
      success: true,
      optimization_results: {
        size_before: 65.8,
        size_after: 45.2,
        reduction_percentage: 31.3,
        time_taken: 3.5,
        unit: 'MB'
      }
    });
    
    cy.get('[data-testid=optimize-database-button]').click();
    
    cy.wait('@databaseOptimize');
    cy.get('[data-testid=progress-indicator]').should('be.visible');
    
    cy.get('[data-testid=success-notification]').should('be.visible')
      .and('contain', 'Database optimized');
    
    cy.get('[data-testid=optimization-stats]').should('be.visible')
      .and('contain', '65.8 MB')
      .and('contain', '45.2 MB')
      .and('contain', '31.3%');
  });
});

describe('Settings Persistence', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should persist settings across page reloads', () => {
    cy.visit('/settings');
    cy.mockSettingsResponse(defaultSettings);
    
    cy.get('[data-testid=tab-voice]').click();
    cy.get('[data-testid=voice-enabled-toggle]').click();
    
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=web-search-toggle]').click();
    
    cy.mockSettingsUpdate({ 
      success: true, 
      settings: {
        ...defaultSettings,
        voice_settings: { ...defaultSettings.voice_settings, enabled: true },
        privacy_settings: { ...defaultSettings.privacy_settings, allow_web_search: true }
      }
    });
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.reload();
    
    cy.mockSettingsResponse({
      ...defaultSettings,
      voice_settings: { ...defaultSettings.voice_settings, enabled: true },
      privacy_settings: { ...defaultSettings.privacy_settings, allow_web_search: true }
    });
    
    cy.get('[data-testid=tab-voice]').click();
    cy.get('[data-testid=voice-enabled-toggle]').should('be.checked');
    
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=web-search-toggle]').should('be.checked');
  });

  it('should reflect settings changes in other parts of the application', () => {
    cy.visit('/settings');
    
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=web-search-toggle]').click();
    
    cy.mockSettingsUpdate({ 
      success: true, 
      settings: {
        ...defaultSettings,
        privacy_settings: { ...defaultSettings.privacy_settings, allow_web_search: true }
      }
    });
    
    cy.get('[data-testid=save-settings-button]').click();
    
    cy.visit('/chat');
    
    cy.get('[data-testid=web-search-indicator]').should('contain', 'Web: ON');
    
    cy.get('[data-testid=message-input]').type('What is the weather in New York?{enter}');
    cy.get('[data-testid=web-search-result]').should('be.visible');
  });

  it('should reset settings to defaults', () => {
    cy.visit('/settings');
    cy.mockSettingsResponse(updatedSettings);
    
    cy.get('[data-testid=reset-to-defaults-button]').click();
    cy.get('[data-testid=confirm-dialog]').should('be.visible');
    cy.get('[data-testid=confirm-button]').click();
    
    cy.mockSettingsReset();
    
    cy.get('[data-testid=tab-voice]').click();
    cy.get('[data-testid=voice-enabled-toggle]').should('not.be.checked');
    
    cy.get('[data-testid=tab-privacy]').click();
    cy.get('[data-testid=local-storage-toggle]').should('be.checked');
    cy.get('[data-testid=analytics-toggle]').should('not.be.checked');
    
    cy.get('[data-testid=success-notification]').should('be.visible')
      .and('contain', 'Settings reset to defaults');
  });
});

describe('Responsive Design', () => {
  beforeEach(() => {
    cy.login();
    cy.mockSettingsResponse(defaultSettings);
  });

  it('should adapt to desktop layout', () => {
    cy.viewport(1280, 800);
    cy.visit('/settings');
    
    cy.get('[data-testid=settings-tabs]').should('have.class', 'vertical-tabs');
    cy.get('[data-testid=settings-content]').should('have.class', 'desktop-layout');
    cy.get('[data-testid=voice-settings]').should('have.css', 'max-width').and('not.eq', '100%');
  });

  it('should adapt to tablet layout', () => {
    cy.viewport(768, 1024);
    cy.visit('/settings');
    
    cy.get('[data-testid=settings-tabs]').should('have.class', 'horizontal-tabs');
    cy.get('[data-testid=settings-content]').should('have.class', 'tablet-layout');
    cy.get('[data-testid=voice-settings]').should('have.css', 'max-width').and('not.eq', '100%');
  });

  it('should adapt to mobile layout', () => {
    cy.viewport(375, 667);
    cy.visit('/settings');
    
    cy.get('[data-testid=settings-tabs]').should('have.class', 'horizontal-tabs-scroll');
    cy.get('[data-testid=settings-content]').should('have.class', 'mobile-layout');
    cy.get('[data-testid=voice-settings]').find('.form-row').should('have.css', 'flex-direction', 'column');
    cy.get('[data-testid=voice-enabled-toggle]').should('have.css', 'height').and('not.lt', '24px');
  });
});