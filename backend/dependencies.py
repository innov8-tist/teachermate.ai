from db_operation.db_server import DBServiceForServer

def get_db_service():
    db_service = DBServiceForServer()
    try:
        yield db_service
    finally:
        db_service.close()
