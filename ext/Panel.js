Ext.define('Plugin.mail-lists.Panel', {

    extend:'Ext.grid.GridPanel',
    
    columns: [
		{header: "ID", width: 75, dataIndex: 'id'},
        {flex: 1, header: _('Имя'), width: 275, dataIndex: 'name'},
        {header: _('Описание'), width: 400, dataIndex: 'describ'}
    ],
    
    selModel: {
        mode: 'SINGLE',
        listeners: {
            'selectionchange' : {
                fn: function(sm) {
                    var hs = sm.hasSelection();
                    Ext.getCmp('tb_mail_edit').setDisabled(!hs);
                    Ext.getCmp('tb_mail_delete').setDisabled(!hs);
                    //Ext.getCmp('tb_mail_preview').setDisabled(!hs);
                    Ext.getCmp('tb_mail_send').setDisabled(!hs);
                },
                scope: this
            }
        }
    },
    
    initComponent : function() {
   
        this.store = new Ext.data.JsonStore({
            autoDestroy: true,
            remoteSort: true,
            fields: ['name','describ'],            
            sortInfo: {field: "name", direction: "ASC"},
            totalProperty: 'total',
            proxy: {
                type: 'ajax',
                url: '/cms/plugins/mail-lists/scripts/data_mail_lists.php',
                simpleSortMode: true,
                reader: {
                    rootProperty: 'rows',
                    idProperty: 'id'
                }
            }
        });
                
        this.tbar = new Ext.Toolbar({
                    items: [
                        {
                            id: 'tb_mail_create',
                            icon: 'images/create_mail.gif',
                            iconCls: 'x-fa fa-envelope-open-text',
                            tooltip: _('Разослать письмо пользователям'),
                            handler: function () { this.createMail(); },
                            scope: this
                        }, '-',                    
                        {
                            id: 'tb_mail_new',
                            iconCls:'icon-new x-fa fa-plus',
                            tooltip:_('Создать'),
                            handler: function () { this.edit(0); },
                            scope: this
                        }, '-',
                        {
                            id: 'tb_mail_edit',
                            disabled: true,
                            iconCls:'icon-edit x-fa fa-edit',
                            tooltip:_('Редактировать'),
                            handler: function () { this.edit(this.getSelectionModel().getSelection()[0].getId()); },
                            scope: this
                        },
                        {
                            id: 'tb_mail_delete',
                            disabled: true,
                            iconCls:'icon-delete  x-fa fa-trash',
                            tooltip: _('Удалить'),
                            handler: function () { this.delete_list(); },
                            scope: this
                        },
                        '-',
                        {
                            id: 'tb_mail_send',
                            disabled: true,
                            icon: '/cms/plugins/mail-lists/images/icon_send.gif',
                            iconCls: 'x-fa fa-paper-plane',
                            tooltip: _('Разослать'),
                            handler: function() { this.send(); },
                            scope: this
                        },
                        '-',
                        {
                            iconCls: 'icon-settings x-fa fa-tools',
                            tooltip: _('Настройки модуля'),
                            handler: this.setup,
                            scope: this
                        }                          
                    ]
                });
        
        this.on({
            'beforedestroy': function() {
                if (this.propertiesWin) this.propertiesWin.close();
                this.propertiesWin = false;
                if (this.chooseWin) this.chooseWin.close();
                this.chooseWin = false;
            },
            'celldblclick' : function() {
                this.edit(this.getSelectionModel().getSelection()[0].getId());
            },
            scope: this
        });
               
        this.fireEvent('activate');
        this.callParent();
        this.reload();
    },

    border: false,
    loadMask: true,
    stripeRows: true,
    
    setup: function() {
        Ext.create('Plugin.mail-lists.Settings');        
    },
    
    createMail: function() {
          var sendWin = Ext.create('Plugin.mail-lists.MailListSendWindow', {
			  listId: 0,
			  historyId: 0,
			  materials: null
		  });
          sendWin.show();
    },     
       
    edit: function(id) {
        if (!this.propertiesWin) {
            this.propertiesWin = Ext.create('Plugin.mail-lists.Properties');
            this.propertiesWin.on('listChanged', function(id, name) {
                if (id)
                    this.store.getById(id).set('name', name);
                    else this.reload();
            }, this);
        }
        this.propertiesWin.show(id);
    }, 
    
    send: function() {
        if (!this.chooseWin) {
            this.chooseWin = Ext.create('Plugin.mail-lists.Choose');
            this.chooseWin.on('select', function() {
                var sendWin = Ext.create('Plugin.mail-lists.MailListSendWindow', {
				  listId: this.getSelectionModel().getSelection()[0].getId(),
				  historyId: 0,
				  materials: this.chooseWin.store
			    });
                sendWin.show();
            }, this);
        }
        this.chooseWin.show(this.getSelectionModel().getSelection()[0].getId());
    },
      
    delete_list: function() {
        Ext.MessageBox.confirm(_('Удалить рассылку'), _('Вы уверены'), function(btn) {
            if (btn == 'yes') this.call('delete_list');
        }, this);
    },
      
    call: function(action) {
        Ext.Ajax.request({
            url: '/cms/plugins/mail-lists/scripts/action_mail_lists.php',
            params: { 
                action: action, 
                id: this.getSelectionModel().getSelection()[0].getId()
            },
            scope: this,
            success: function(resp) {
                this.store.reload();
            }
        });
    },
        
    reload: function() {
        this.store.load();
    }
});