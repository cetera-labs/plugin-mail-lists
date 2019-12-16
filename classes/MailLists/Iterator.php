<?php
namespace MailLists;

class Iterator extends \Cetera\Iterator\DbObject {
	
    public function __construct()
    {       
        parent::__construct();		
        $this->query->select('main.*')->from('mail_lists', 'main');        
    } 	
	
	 protected function fetchObject($row)
	 {
		 return Newsletter::fetch($row);
	 }
	
}