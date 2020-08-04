Ext.define('Plugin.mail-lists.Settings', {

    extend:'Ext.Window',

    autoShow: true,
    width: 600,
    height: 200,
    layout: 'fit',
    modal: true,
    resizable: false,
    border: false,
    title: _('Настройки модуля'),
    
	items: [
		{
            itemId: 'settings_form',
			xtype: 'form',
			defaultType: 'textfield',
			bodyCls: 'x-window-body-default', 
			bodyPadding: 5,
			border: false,
			defaults: {
				anchor: '100%',
				labelWidth: 200,
				hideEmptyLabel: false
			},			
			items: [
				{
                    xtype: 'combobox',
					fieldLabel: _('Отправка писем через'),
					name: 'mailer',
                    store: {
                        fields: ['id', 'name'],
                        data : [
                            {"id":"phpmailer", "name":"PHPMailer"},
                            {"id":"sengrid",   "name":"Twilio SendGrid"}
                        ]
                    },
                    displayField: 'name',
                    valueField: 'id',
                    value: 'phpmailer',
                    editable: false
				},
                {
                    xtype     : 'textareafield',
                    name      : 'sengrid_api_key',
                    fieldLabel: 'SendGrid API Key'
                }
			]
		}		
	],      
      
    initComponent : function() {
                
        this.buttons = [{
            text: _('Сохранить'),
            scope: this,
            handler: function() {

                this.getComponent('settings_form').setLoading(true);
                Ext.Ajax.request({
                    url: '/plugins/mail-lists/scripts/data_settings.php',
                    method: 'POST',
                    params: this.getComponent('settings_form').getForm().getValues(),
                    success: function(response, opts) {
                        this.getComponent('settings_form').setLoading(false);
                        this.close();
                    },
                    scope: this
                });	

            }
        },{
            text: _('Отмена'),
            scope: this,
            handler: this.close
        }];
        
        this.callParent();
    },
    
	afterRender: function(){
		this.getComponent('settings_form').setLoading(true);
		Ext.Ajax.request({
			url: '/plugins/mail-lists/scripts/data_settings.php',
			success: function(response, opts) {
				var obj = Ext.decode(response.responseText);
				this.getComponent('settings_form').getForm().setValues(obj);
				this.getComponent('settings_form').setLoading(false);
			},
			scope: this
		});
	
		this.callParent();
	}    
});
