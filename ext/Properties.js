Ext.define('Plugin.mail_lists.Properties', {

    extend:'Ext.Window',
    
    closeAction: 'hide',
    title: '',
    width: 650,
    height: 463,
    layout: 'vbox',
    modal: true,
    resizable: false,
    border: false,
    
    listId: 0,
       
    initComponent : function() {
    
        this.users = Ext.create('Cetera.users.Panel', {
            url: '/plugins/mail_lists/data_users.php',
            baseParams: {'id': 0},
            filter: _('только подписанные'),
            tbar: [
                '-',{
                    text: _('Подписать всех'),
                    handler: function() {
                        this.subscribe('subscribe_all');
                    },
                    scope: this
                },
                {
                    text: _('Отписать всех'),
                    handler: function() {
                        this.subscribe('unsubscribe_all');
                    },
                    scope: this
                }
            ]
        });
        
        this.historyStore = Ext.create('Ext.data.JsonStore', {
            autoDestroy: true,
            fields: ['id','state','state_text','form_date'],
            totalProperty: 'total',
            proxy: {
                type: 'ajax',
                extraParams: {'id': 0, 'limit': Cetera.defaultPageSize},
                url: '/plugins/mail_lists/data_history.php',
                simpleSortMode: true,
                reader: {
                    root: 'rows',
                    idProperty: 'id'
                }
            }
        });
        
        this.historyGrid = Ext.create('Ext.grid.GridPanel', {
            store: this.historyStore,
            selModel: {
                mode: 'SINGLE',
                listeners: {
                    'selectionchange' : {
                        fn: function(sm) {
                            var s = 0;
                            if (this.historyGrid.getSelectionModel().getSelection().length)
                                s = this.historyGrid.getSelectionModel().getSelection()[0].get('state');
                            Ext.getCmp('tb_ml_his_send').setDisabled(!sm.hasSelection() || s == 3);
                            Ext.getCmp('tb_ml_his_del').setDisabled(!sm.hasSelection());
                        }, scope: this
                    }
                }
            },
            loadMask: true,
            columns: [
                {width: 115, dataIndex: 'form_date', header: _('Дата')},
                {flex:1,dataIndex: 'state_text', header: _('Статус')}
            ],
            bbar: new Ext.PagingToolbar({
                store: this.historyStore,
                pageSize: Cetera.defaultPageSize
            }),
            tbar: [{
                iconCls:'icon-clean',
                tooltip: _('Очистить историю'),
                handler: function() {
                    Ext.MessageBox.confirm(_('Очистка истории'), _('Вы уверены?'), function(btn) {
                        if (btn == 'yes') this.cleanHistory();
                    }, this);
                },
                scope: this
            },{
                id: 'tb_ml_his_send',
                icon: '/plugins/mail_lists/icon_send.gif',
                disabled: true,
                tooltip: _('Посмотреть/Разослать'),
                handler: this.sendHistory,
                scope: this
            },{
                id: 'tb_ml_his_del',
                iconCls:'icon-delete',
                disabled: true,
                tooltip: _('Удалить'),
                handler: function() {
                    Ext.MessageBox.confirm(_('Удалить'), _('Вы уверены?'), function(btn) {
                        if (btn == 'yes') this.deleteHistory();
                    }, this);
                },
                scope: this
            }]
        });
               
        this.catsGrid = Ext.create('Ext.grid.GridPanel', {
            store: new Ext.data.JsonStore({
                autoDestroy: true,
                fields: ['id','name'],
                totalProperty: 'total',
                proxy: {
                    type: 'ajax',
                    extraParams: {'id': 0},
                    url: '/plugins/mail_lists/data_catalogs.php',
                    simpleSortMode: true,
                    reader: {
                        root: 'rows',
                        idProperty: 'id'
                    }
                }
            }),
            hideHeaders: true,
            selModel: {
                mode: 'SINGLE',
                listeners: {
                    'selectionchange' : {
                        fn: function(sm) {
                            Ext.getCmp('tb_cat_remove').setDisabled(!sm.hasSelection());
                        }, scope: this
                    }
                }
            },
            loadMask: true,
            columns: [
                {width: 20, renderer: function(v, m) { m.css = 'icon-folder'; } },
                {flex: 1,dataIndex: 'name'}],
            tbar: [{
                iconCls: 'icon-plus',
                tooltip: _('Добавить раздел'),
                handler: function() {
                    if (!this.siteTree) {
                        this.siteTree = Ext.create('Cetera.window.SiteTree', {
                            title: _('Выберете раздел'),
                            norootselect: 1,
                            nolink: 1
                        });
                        this.siteTree.on('select', function(res) {
                            this.catsGrid.store.add({
                                id: res.id,
                                name: res.name_to
                            });
                        },this);
                    }
                    this.siteTree.show(); 
                },
                scope: this
            },{
                id: 'tb_cat_remove',
                iconCls:'icon-minus',
                disabled: true,
                tooltip: _('Удалить раздел'),
                handler: function () { this.catsGrid.getStore().remove(this.catsGrid.getSelectionModel().getSelection()[0]); },
                scope: this
            }]
        });
        
        this.ml_interval = Ext.create('Ext.form.FieldContainer', {
            hidden: true,
			layout: {
				type: 'hbox',
				defaultMargins: {top: 0, right: 5, bottom: 0, left: 0}
			},	
			hideEmptyLabel: false,
            items: [
              {
                   xtype: 'displayfield',
                   value: _('каждый')
               },{
                   name : 'schedule_period',
                   xtype: 'numberfield',
                   width: 50
               },{
                   xtype: 'displayfield',
                   value: _('день')
               },{
                   id: 'ml_month',
                   xtype: 'displayfield',
                   value: _('месяца')
               }
            ]        
        });
    
        this.tabs = new Ext.TabPanel({
            deferredRender: false,
            activeTab: 0,
            plain:true,
            border: false,
            activeTab: 0,
            bodyStyle:'background: none',
            height: 400,
            defaults:{bodyStyle:'background:none; padding:5px'},
            items: [{
                title: _('Основные'),
                layout: 'form',
                defaults: { anchor: '0' },
                defaultType: 'textfield',
                items: [
                    {
                        fieldLabel: _('Имя'),
                        name: 'name',
                        allowBlank:false
                    }, {
                        fieldLabel: _('Описание'),
                        name: 'describ'
                    },{
                        fieldLabel: _('От'),
						regex: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
                        name: 'sender'
                    },
                    new Ext.form.ComboBox({
                        fieldLabel: _('Content-type'),
                        name:'contenttype',
                        store: new Ext.data.SimpleStore({
                            fields: ['name'],
                            data : [["text/html"],["text/plain"]]
                        }),
                        valueField:'name',
                        displayField:'name',
                        mode: 'local',
                        triggerAction: 'all',
                        editable: false
                    }),{
                        fieldLabel: _('Тема письма'),
                        name: 'subject'
                    },{
                        fieldLabel: _('Фильтр материалов'),
                        name: 'material_where'
                    },{
                        xtype:'fieldset',
                        title: _('Расписание'),
                        autoHeight:true,
                        defaults: { 
							anchor: '0',
							hideEmptyLabel: false,
						},
                        defaultType: 'textfield',
                        items: [
                            new Ext.form.ComboBox({
                                fieldLabel: _('Периодичность'),
                                name:'schedule',
                                store: new Ext.data.SimpleStore({
                                    fields: ['id','name'],
                                    data : [
                                        [0, _('нет')],
                                        [1, _('по дням')],
                                        [2, _('по неделям')],
                                        [3, _('по месяцам')]
                                    ]
                                }),
                                valueField: 'id',
                                displayField: 'name',
                                mode: 'local',
                                triggerAction: 'all',
                                editable: false,
                                listeners: {
                                    select: function(combo) {
                                        var f = this.form.getForm();
                                        this.ml_interval.setVisible(combo.value==1 || combo.value==3);
                                        f.findField('ml_week').setVisible(combo.value==2);
                                        var m = f.findField('ml_month');
                                        if (m) m.setVisible(combo.value==3);
                                    },
                                    scope: this
                                }
                            }),{
                                id: 'ml_week',
                                xtype: 'checkboxgroup',
                                hidden: true,
                                items: [
                                    {boxLabel: _('Пн'), name: 'd0', inputValue: 1 },
                                    {boxLabel: _('Вт'), name: 'd1', inputValue: 2 },
                                    {boxLabel: _('Ср'), name: 'd2', inputValue: 4 },
                                    {boxLabel: _('Чт'), name: 'd3', inputValue: 8 },
                                    {boxLabel: _('Пт'), name: 'd4', inputValue: 16},
                                    {boxLabel: _('Сб'), name: 'd5', inputValue: 32},
                                    {boxLabel: _('Вс'), name: 'd6', inputValue: 64}
                                ]
                            },
                            this.ml_interval
                        ]
                    }
                ]
            },{
                title: _('Шаблон письма'),
                layout : 'fit',
                items: [{
                    xtype:'textarea',
                    name:'body'
                }]
            },{
                title: _('Пользователи'),
                layout: 'fit',
                items: this.users
            },{
                title: _('Разделы для рассылки'),
                layout: 'fit',
                items: this.catsGrid,
                listeners: {
                    'activate' : {
                        fn: function() { this.catsGrid.getView().refresh(); }, 
                        scope: this
                    }
                }
            },{
                title: _('История'),
                layout: 'fit',
                items: this.historyGrid,
                listeners: {
                    'activate' : {
                        fn: function() { this.historyGrid.getView().refresh(); }, 
                        scope: this
                    }
                }
            }]
        });
        
        this.form = new Ext.FormPanel({
            labelWidth: 140,
            border: false,
            width: 638,
            bodyStyle:'background: none',
            method: 'POST',
            waitMsgTarget: true,
            url: '/plugins/mail_lists/action_mail_lists.php',
            items: this.tabs
        });
        
        this.items = this.form;
        
        this.buttons = [{
            text: _('Ok'),
            scope: this,
            handler: this.submit
        },{
            text: _('Отмена'),
            scope: this,
            handler: function(){ this.hide(); }
        }];
    
        this.callParent();
    },
    
    subscribe: function(action) {
        Ext.MessageBox.confirm(_('Подписка'), _('Вы уверены?'), function(btn) {
            if (btn == 'yes') {
                Ext.Ajax.request({
                    url: '/plugins/mail_lists/action_mail_lists.php',
                    params: { 
                        action: action, 
                        id: this.listId
                    },
                    scope: this,
                    success: function(resp) {
                        this.users.reload();
                    }
                });            
            }
        }, this);    
    },
    
    show : function(id) {
        this.form.getForm().reset();
        this.tabs.setActiveTab(0);
        
        this.callParent();
                
        this.listId = id;
        if (id > 0) {
            Ext.Ajax.request({
                url: '/plugins/mail_lists/action_mail_lists.php',
                params: { 
                    action: 'get_list', 
                    id: this.listId
                },
                scope: this,
                success: function(resp) {
                    var obj = Ext.decode(resp.responseText);
                    this.setTitle(_('Свойства')+': ' + obj.data.name);
                    this.form.getForm().setValues(obj.data);
                    var s = this.form.getForm().findField('schedule');
                    s.fireEvent('select', s); 
                    var w = this.form.getForm().findField('ml_week');
                    for (var i=0; i<7; i++) {
                        w.setValue('d'+i, (obj.data.schedule_period & Math.pow(2,i)) > 0);
                    }
                }
            });
        } else {
            this.setTitle(_('Новая рассылка'));
        }
        
        var s = this.form.getForm().findField('schedule');
        s.setValue(s.getStore().getAt(0).get('id'));  
       
        var s = this.form.getForm().findField('schedule');
        s.fireEvent('select', s); 
        
        var c = this.form.getForm().findField('contenttype');
        c.setValue(c.getStore().getAt(0).get('name'));
    
        this.users.checked = [];
        this.users.unchecked = [];
        this.users.getStore().proxy.extraParams['id'] = this.listId;
        this.users.getStore().reload();
        
        this.catsGrid.getStore().proxy.extraParams['id'] = this.listId;
        this.catsGrid.getStore().reload();
        this.historyStore.proxy.extraParams['id'] = this.listId;
        this.historyStore.reload();
    },
       
    submit: function() {
        var subscribe = '0';
        for (var i in this.users.checked) if (!isNaN(parseInt(i))) subscribe += ',' + i;
        var unsubscribe = '0';
        for (var i in this.users.unchecked) if (!isNaN(parseInt(i))) unsubscribe += ',' + i;
    
        var m = [];
        var i = 0;
        this.catsGrid.store.each(function(rec){
            m[i++] = rec.get('id');
        },this);
    
        var params = {
            action: 'save_list', 
            id: this.listId,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            'catalogs[]': m
        };
        this.form.getForm().submit({
            params: params,
            scope: this,
            waitMsg:_('Сохранение...'),
            success: function(resp) {
                this.fireEvent('listChanged', this.listId, this.form.getForm().findField('name').getValue());
                this.hide();
            }
        });
    },
    
    cleanHistory: function() {
        Ext.Ajax.request({
            url: '/plugins/mail_lists/action_mail_lists.php',
            params: { 
                action: 'clear_history', 
                id: this.listId
            },
            scope: this,
            success: function(resp) {
                this.historyStore.reload();
            }
        });
    },
    
    deleteHistory: function() {
        Ext.Ajax.request({
            url: '/plugins/mail_lists/action_mail_lists.php',
            params: { 
                action: 'delete_history', 
                id: this.historyGrid.getSelectionModel().getSelection()[0].getId()
            },
            scope: this,
            success: function(resp) {
                this.historyStore.reload();
            }
        });
    },
    
    sendHistory: function() {
        var sendWin =  Ext.create('Plugin.mail_lists.MailListSendWindow', {
			  listId: 0,
			  historyId: this.historyGrid.getSelectionModel().getSelection()[0].getId(),
			  materials: false
		});
        sendWin.on('close', function() {
            this.historyStore.reload();
        }, this);
        sendWin.show();
    }
});