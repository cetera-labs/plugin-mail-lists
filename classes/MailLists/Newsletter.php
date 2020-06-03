<?php
namespace MailLists;

class Newsletter extends \Cetera\Base {
	
	use \Cetera\DbConnection;
	
	protected $_subject;
	protected $_name;
	protected $_describ;
	
	public static function enum()
	{
		return new Iterator();
	}
	
	public static function fetch( $data )
	{
		return new self( $data );
	}
	
	public static function getById( $id )
	{
		
		$data = self::getDbConnection()->fetchAssoc('
              	SELECT * 
              	FROM mail_lists
              	WHERE id = ?',
                array($id)
        );	
		if ($data) return new self($data);
		
		$a = \Cetera\Application::getInstance();
		throw new \Exception(sprintf(_('Рассылка ID=%s не найдена'),$id));		
		
	}
	
	public function subscribe( $user )
	{
		
		if ( ! $user instanceof \Cetera\User )
		{
			$email = $user;
			$user = NULL;
			$user = \Cetera\User::getByEmail( $email );
			if ( !$user )
			{
				
				$user = \Cetera\User::create();
				$user->setFields(array(
					'login'    => $email,
					'email'    => $email,
					'disabled' => 1
				));
				$user->save();
			}
		}
		
		if ($user && !$this->isSubscribed( $user ))
		{
			self::getDbConnection()->insert('mail_lists_users', array('idlist' => $this->id, 'iduser' => $user->id));
		}
		
		return $this;
	}
	
	public function isSubscribed( $user )
	{
		if ( ! $user instanceof \Cetera\User )
		{
			$uid = $user;
			$user = NULL;
			$user = \Cetera\User::getById( (int)$uid );
		}
		if (!$user) return false;
		
		$res = self::getDbConnection()->fetchAssoc('SELECT COUNT(*) as cnt FROM mail_lists_users WHERE iduser=? and idlist=?', array($user->id, $this->id));
		
		return $res['cnt'] > 0;
	}
    
	public function getSubscribers()
	{
        $res = \Cetera\User::enum();
        $res->getQuery()->leftJoin('main', 'mail_lists_users', 'MLU', 'main.id = MLU.iduser')->andWhere('MLU.idlist='.$this->id);
        return $res;
    }        
	
	public function unsubscribe( $user )
	{
		if ( ! $user instanceof \Cetera\User )
		{
			$email = $user;
			$user = NULL;
			$user = \Cetera\User::getByEmail( $email );
		}
		
		if ($user)
		{
			self::getDbConnection()->delete('mail_lists_users', array('idlist' => $this->id, 'iduser' => $user->id));
		}
		
		return $this;		
	}	
	
}