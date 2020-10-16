Ext.define('Plugin.mail-lists.MailListSendWindow', {

    extend:'Ext.Window',

    width: 800,
    height: 600,
    layout: 'anchor',
    resizable: false,
    border: false,
    closable: false,
    bodyStyle: 'padding:5px',
    defaults: { anchor: '0'},
    title: _('Рассылка'),
    
    historyId: 0,
    listId: 0,
    queue: 0,
	materials: false,
       
    initComponent : function() {
               
        this.subject = new Ext.form.TextField({
            fieldLabel: _('Тема')
        });

        this.testButton = Ext.create('Ext.Button',{
            text: _('Тестовая рассылка'),
            disabled: true,
            scope: this,
            handler: this.testSend                
        });
        
        this.retryButton = Ext.create('Ext.Button',{
            text: _('Повторить'),
            disabled: true,
            scope: this,
            handler: function() { this.send(); }                 
        });
        
        this.pauseButton = Ext.create('Ext.Button', {
            text: _('Приостановить'),
            scope: this,
            handler: function() { this.queueStatus(5); }
        });
        
        this.suspendButton = Ext.create('Ext.Button',{
            text: _('Отложить рассылку'),
            scope: this,
            disabled: true,
            handler: this.close
        });
        
        this.cancelButton = Ext.create('Ext.Button',{
            text: _('Отменить рассылку'),
            scope: this,
            disabled: true,
            handler: function() {  
                Ext.MessageBox.confirm(_('Отменить рассылку'), _('Вы уверены?'), function(btn) {
                    if (btn == 'yes') {
                        if (this.historyId)
                            this.status(6);
                            else this.close();
                    }
                }, this);
            }
        });
        
        this.sendButton = Ext.create('Ext.Button',{
            text: _('Провести рассылку'),
            scope: this,
            disabled: true,
            handler: this.startSend
        });
		
		this.items = [this.subject];
		
        if (this.listId) {
			
            if (!this.historyId) {
                var m = '';

                this.materials.each(function(rec){
                    m += rec.get('table')+','+rec.get('id')+';';
                },this);
                Ext.Ajax.request({
                    url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                    params: { 
                        action: 'form_list', 
                        id: this.listId,
                        'materials': m
                    },
                    scope: this,
                    success: this.setup
                });
                
            } else {
            
                Ext.Ajax.request({
                    url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                    params: { 
                        action: 'get_history', 
                        id: this.historyId
                    },
                    scope: this,
                    success: this.setup
                });
            
            }
			
        } else {
        
            this.setHeight(600);
            
            this.from = new Ext.form.TextField({
                fieldLabel: _('От'),
                value: 'Nobody <nobody@nowhere.com>'
            });              
            		
            this.mail_body = Ext.create('Cetera.field.ck.Small', {
				height: 350
            });  					
            
            this.filterStore = new Ext.data.JsonStore({
                autoDestroy: true,
                fields: ['id','name','sql'],
                proxy: {
                    type: 'ajax',
                    url: '/plugins/mail-lists/scripts/data_user_filters.php',
                    simpleSortMode: true,
                    reader: {
                        root: 'rows',
                        idProperty: 'id'
                    }
                }
            }); 
            this.filterStore.reload();
            
            this.filter = new Ext.grid.GridPanel({
                store: this.filterStore,
                height: 125,
                title: _('Получатели'),
                hideHeaders: true,
                loadMask: true,
                columns: [{flex:1,dataIndex: 'name'}]
        
                ,
                selModel: {
                    mode: 'SINGLE',
                    listeners: {
                        'selectionchange' : {
                            fn: function(sm) {
                                Ext.getCmp('tb_filter_remove').setDisabled(!sm.hasSelection());
                                Ext.getCmp('tb_filter_edit').setDisabled(!sm.hasSelection());
                            }, scope: this
                        }
                    }
                },                
                tbar: [{
                    id: 'tb_mail_add',
                    iconCls:'icon-plus',
                    tooltip:_('Добавить фильтр'),
                    handler: function () {
                        this.filterPropForm.getForm().findField('name').setValue('');
                        this.filterPropForm.getForm().findField('sql').setValue('* FROM users');
                        this.filterPropForm.getForm().findField('id').setValue(0);
                        this.filterPropWin.setTitle(_('Новый фильтр'));
                        this.filterPropWin.show();                    
                    },
                    scope: this
                },{
                    id: 'tb_filter_edit',
                    iconCls:'icon-edit',
                    disabled: true,
                    tooltip: _('Изменить фильтр'),
                    handler: function () {
                        var sel = this.filter.getSelectionModel().getSelection()[0];
                        if (sel.getId() < 0) return;
                        this.filterPropForm.getForm().findField('name').setValue(sel.get('name'));
                        this.filterPropForm.getForm().findField('sql').setValue(sel.get('sql'));
                        this.filterPropForm.getForm().findField('id').setValue(sel.getId());
                        this.filterPropWin.setTitle(_('Новый фильтр'));
                        this.filterPropWin.show();                         
                    },
                    scope: this
                },{
                    id: 'tb_filter_remove',
                    iconCls:'icon-minus',
                    disabled: true,
                    tooltip:_('Удалить фильтр'),
                    handler: function () {
                        if (this.filter.getSelectionModel().getSelection()[0].getId() > 0)
                            Ext.MessageBox.confirm(_('Удалить фильтр'), _('Вы уверены&'), function(btn) {
                                if (btn == 'yes') {
                                    Ext.Ajax.request({
                                        url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                                        params: { 
                                            action: 'delete_filter', 
                                            id: this.filter.getSelectionModel().getSelection()[0].getId()
                                        },
                                        scope: this,
                                        success: function(resp) {
                                            this.filterStore.reload();
                                        }
                                    });                            
                                };
                            }, this);                    
                    },
                    scope: this
                }]  
               
            });
            
            this.filterPropForm = new Ext.form.FormPanel({
                baseCls    : 'x-plain',
                width      : '100%',
                defaultType: 'textfield',
                bodyStyle  : 'padding:5px 5px 0;',
                fieldDefaults: {
                    labelWidth : 100,
                    anchor: '0' 
                },
                waitMsgTarget: true,
                items      : [
                    {
                        fieldLabel: _('Имя фильтра'),
                        allowBlank: false,
                        name: 'name'
                    },{
                        fieldLabel: _('SQL<br>(без SELECT)'),
                        allowBlank: false,
                        xtype: 'textareafield',
                        name: 'sql'
                    },{
                        xtype: 'hiddenfield',
                        name: 'id',
                        value: 0
                    }
                ]
            });  
            
            this.filterPropWin = new Ext.Window({
                closable:true,
                width:600,
                height:190,
                closeAction: 'hide',
                plain:true,
                resizable: false,
                modal: true,
                header: true,
                layout: 'fit',
                items: [this.filterPropForm],
                buttons: [
                    {
                        text: _('Проверить SQL'),
                        scope: this,
                        handler: function() { this.testSQL(); }
                    },{
                        text: _('ОК'),
                        scope: this,
                        handler: function() { this.saveFilter(); }
                    },{
                        text: _('Отмена'),
                        scope: this,
                        handler: function() { this.filterPropWin.hide(); }
                    }
                ]
            });               
                      
             
            this.sendButton.enable();
            this.testButton.enable();
            this.cancelButton.enable(); 
			
			this.items = [this.subject, this.from, this.mail_body, this.filter];
			
        }	
               
        this.buttons = [this.testButton,this.sendButton,this.suspendButton,this.cancelButton];
        
        this.callParent();
        
        this.on('close', function() {
            if (this.progressWin) this.progressWin.close();
        }, this);	
    },
    
    send : function() {
        this.retryButton.disable();
        Ext.Ajax.request({
            url: '/plugins/mail-lists/scripts/action_mail_lists.php',
            params: { 
                action: 'send_list', 
                id: this.historyId
            },
            scope: this,
            failure: function(response, opts) {
                this.retryButton.enable();
            },
            success: function(resp) {
                var obj = Ext.decode(resp.responseText);
                if (obj.data.code == 1) {
                    this.pbar.updateProgress(obj.data.progress, obj.data.msg);
                    if (this.queue) 
                        this.status(this.queue);
                        else this.send();
                }
                if (obj.data.code == 2) {
                    Ext.MessageBox.show({
                       msg: obj.data.msg,
                       buttons: Ext.MessageBox.OK,
                       icon: Ext.MessageBox.INFO,
                       scope: this,
                       fn: function() { this.close(); }
                   });
                }
                if (obj.data.code == 3) {
                    this.retryButton.enable();
                    Ext.MessageBox.show({
                       msg: obj.data.msg,
                       buttons: Ext.MessageBox.OK,
                       icon: Ext.MessageBox.INFO
                   });          
                }
            }
        });
    },
    
    checkValues : function() {
        if (!this.subject.getValue()) {
            Ext.MessageBox.alert(_('Ошибка'),_('Поле "Тема" обязательно для заполнения'));             
            return false;
        }    
        return true;
    },
    
    startSend : function() {
        if (!this.checkValues()) return;
        
        if (!this.listId && !this.filter.getSelectionModel().hasSelection()) {
                Ext.MessageBox.alert(_('Ошибка'),_('Выберите получателей'));                          
                return false;
        }          
        
        this.sendButton.disable();
        this.testButton.disable();
        this.pbar = new Ext.ProgressBar();
        this.progressWin = new Ext.Window({
            height: 100,
            title: _('Рассылка ...'),
            width: 400,
            modal: true,
            resizable: false,
            border: false,
            closable: false,
            bodyStyle: 'padding:5px',
            items: this.pbar,
            buttons: [this.retryButton,this.pauseButton,this.cancelButton]
        });
        this.progressWin.show();        
        
        if (this.listId) {
        
            Ext.Ajax.request({
                url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                params: { 
                    action: 'update_history', 
                    id: this.historyId,
                    subject: this.subject.getValue(),
                    body: this.mail_body.getValue()
                },
                scope: this,
                success: function(resp) {
                    this.send();
                }
            });
            
        } else {
        
            this.pauseButton.disable();
            Ext.Ajax.request({
                url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                params: { 
                    action: 'set_history', 
                    subject: this.subject.getValue(),
                    from: this.from.getValue(),
                    filter: this.filter.getSelectionModel().getSelection()[0].getId(),
                    body: this.mail_body.getValue()
                },
                scope: this,
                success: function(resp) {
                    var obj = Ext.decode(resp.responseText);
                    this.historyId = obj.historyId;
                    this.send();
                }
            });        
        
        }
    },
    
    testSend : function(email) {
        if (!this.checkValues()) return;
        
        Ext.Msg.prompt(_('Тестовая рассылка'), _('Введите e-mail получателей'), function(btn, text){
            if (btn == 'ok'){
                Ext.Ajax.request({
                    url: '/plugins/mail-lists/scripts/action_mail_lists.php',
                    params: { 
                        action: 'test_send', 
                        email: text,
                        id: this.historyId,
                        subject: this.subject.getValue(),
                        body: this.mail_body.getValue()
                    },
                    scope: this
                });
            }
        }, this);        
    
    },
    
    queueStatus : function(status) {
        this.pauseButton.disable();
        this.cancelButton.disable();
        this.queue = status
    },
    
    status : function(status) {
        this.cancelButton.disable();
        Ext.Ajax.request({
            url: '/plugins/mail-lists/scripts/action_mail_lists.php',
            params: { 
                action: 'set_status', 
                status: status,
                id: this.historyId
            },
            scope: this,
            success: function(resp) {
                this.close();
            }
        });
    },
        
    testSQL: function() {
        this.filterPropWin.setLoading(true);
        Ext.Ajax.request({
            url: '/plugins/mail-lists/scripts/action_mail_lists.php',
            params: { 
                action: 'test_filter', 
                sql:  this.filterPropForm.getForm().findField('sql').getValue()
            },
            scope: this,
            success: function(resp) {
                this.filterPropWin.setLoading(false);
                var obj = Ext.decode(resp.responseText);
                Ext.Msg.alert('OK', 'Пользователей по запросу: '+obj.count);
            },
            failure: function(resp) {
                this.filterPropWin.setLoading(false);
            }            
        });       
    },
    
    saveFilter: function() {
        this.filterPropForm.getForm().submit({
            url: '/plugins/mail-lists/scripts/action_mail_lists.php', 
            params: {action: 'save_filter'},
            waitMsg: _('Подождите ...'),
            scope: this,
            success: function(form, action) {
                this.filterPropWin.hide();
                this.filterStore.load();
            }
        });    
    },
    
    setup: function(resp) {     
        var obj = Ext.decode(resp.responseText); 
        this.sendButton.enable();
        this.testButton.enable();
        this.suspendButton.enable();
        this.cancelButton.enable();
        
        if (obj.data.is_html) {
			
            this.mail_body = Ext.create('Cetera.field.ck.Small', {
                hideLabel: true,
                height: 500				
            }); 
			
        } else {  
		
            this.mail_body = new Ext.form.TextArea({
                hideLabel: true,
                height: 500
            }); 
			
        }
        
        this.add(this.mail_body);  
        
        this.mail_body.setValue(obj.data.body);
        this.subject.setValue(obj.data.subject);
        
        this.historyId = obj.data.id_history;
        
        this.doLayout(); 
    }
});
