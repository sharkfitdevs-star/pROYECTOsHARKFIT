import unittest
from unittest.mock import patch, Mock

from django_mongo_bridge.client import DjangoMongoBridgeClient, BridgeError

class TestDjangoMongoBridgeClient(unittest.TestCase):
    @patch('django_mongo_bridge.client.requests.get')
    def test_get_client_by_id_success(self, mock_get):
        mock_resp = Mock()
        mock_resp.json.return_value = {'success': True, 'data': {'idMember': 'm-1', 'name': 'Juan'}}
        mock_resp.raise_for_status = Mock()
        mock_get.return_value = mock_resp

        c = DjangoMongoBridgeClient(base_url='http://fake')
        r = c.get_client_by_id('m-1')
        self.assertEqual(r['idMember'], 'm-1')
        self.assertEqual(r['name'], 'Juan')

    @patch('django_mongo_bridge.client.requests.get')
    def test_get_client_network_error(self, mock_get):
        mock_get.side_effect = Exception('net')
        c = DjangoMongoBridgeClient(base_url='http://fake')
        with self.assertRaises(BridgeError):
            c.get_client_by_id('m-1')

if __name__ == '__main__':
    unittest.main()
