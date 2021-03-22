Ext.define('Plugin.mail-lists.Choose', {

    extend:'Ext.Window',
    
    closeAction: 'hide',
    width: 600,
    height: 350,
    layout: 'fit',
    modal: true,
    resizable: false,
    border: false,
    title: _('Выбор материалов для рассылки'),
    bodyStyle:'background: #fff',
    
    listId: 0,
       
    initComponent : function() {
        
        this.store = new Ext.data.JsonStore({
            autoDestroy: true,
            fields: ['id','name','table'],
            totalProperty: 'total',
            proxy: {
                type: 'ajax',
                extraParams: {id: 0},
                url: '/cms/plugins/mail-lists/scripts/data_materials.php',
                simpleSortMode: true,
                reader: {
                    rootProperty: 'rows',
                    idProperty: 'id'
                }
            }
        });
        
        this.grid = new Ext.grid.GridPanel({
            store: this.store,
            hideHeaders: true,
            selModel: {
                mode: 'SINGLE',
                listeners: {
                    'selectionchange' : {
                        fn: function(sm) {
                            Ext.getCmp('tb_mail_remove').setDisabled(!sm.hasSelection());
                        }, scope: this
                    }
                }
            },
            loadMask: true,
            columns: [{flex:1,dataIndex: 'name'}],
            tbar: [{
                id: 'tb_mail_add',
                iconCls:'icon-plus x-fa fa-plus',
                tooltip:_('Добавить'),
                handler: this.addMaterial,
                scope: this
            },{
                id: 'tb_mail_remove',
                iconCls:'icon-minus x-fa fa-plus',
                disabled: true,
                tooltip:_('Удалить'),
                handler: function () { this.store.remove(this.grid.getSelectionModel().getSelected()); },
                scope: this
            }]
        });
        this.items = this.grid;
        
        this.buttons = [{
            text: _('Ok'),
            scope: this,
            handler: function() {
                this.hide();
                this.fireEvent('select');
            }
        },{
            text: _('Отмена'),
            scope: this,
            handler: this.hide
        }];
        
        this.callParent();
    },
    
    addMaterial: function() {
        if (!this.siteTree) {
            this.siteTree = Ext.create('Cetera.window.SiteTree', {
                title: _('Выберете материал'),
                materials : 1,
                nocatselect: 1 
            });
            this.siteTree.on('select', function(res) {
                this.store.add({
                    id: res.id,
                    name: res.name,
                    table: res.table
                });
            },this);
        }
        this.siteTree.show(); 
    },
    
    show : function(id) {
        
        this.listId = id;
        this.store.proxy.extraParams.id = id;
        
        this.callParent();        
        
        this.store.load();

    }
});
