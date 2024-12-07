class Dados:
    _token = None
    _refresh_token = None
    _account_id = None

    @classmethod
    def set_token(cls, token):
        cls._token = token

    @classmethod
    def get_token(cls):
        return cls._token

    @classmethod
    def set_refresh_token(cls, refresh_token):
        cls._refresh_token = refresh_token

    @classmethod
    def get_refresh_token(cls):
        return cls._refresh_token

    @classmethod
    def set_account_id(cls, account_id):
        cls._account_id = account_id

    @classmethod
    def get_account_id(cls):
        return cls._account_id