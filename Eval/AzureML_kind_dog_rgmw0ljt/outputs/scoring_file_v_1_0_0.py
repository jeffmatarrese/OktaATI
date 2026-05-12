# ---------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# ---------------------------------------------------------
import json
import logging
import os
import pickle
import numpy as np
import pandas as pd
import joblib

import azureml.automl.core
from azureml.automl.core.shared import logging_utilities, log_server
from azureml.telemetry import INSTRUMENTATION_KEY

from inference_schema.schema_decorators import input_schema, output_schema
from inference_schema.parameter_types.numpy_parameter_type import NumpyParameterType
from inference_schema.parameter_types.pandas_parameter_type import PandasParameterType
from inference_schema.parameter_types.standard_py_parameter_type import StandardPythonParameterType

input_sample = pd.DataFrame({"event_count": pd.Series([0.0], dtype="float64"), "unique_apps_in_events": pd.Series([0.0], dtype="float64"), "unique_event_types": pd.Series([0.0], dtype="float64"), "failed_auth_count": pd.Series([0.0], dtype="float64"), "scope_request_count": pd.Series([0.0], dtype="float64"), "privilege_escalation_count": pd.Series([0.0], dtype="float64"), "token_refresh_count": pd.Series([0.0], dtype="float64"), "has_scope_delta": pd.Series([0.0], dtype="float64"), "total_scopes_seen": pd.Series([0.0], dtype="float64"), "unique_scopes": pd.Series([0.0], dtype="float64"), "has_admin_scope": pd.Series([0.0], dtype="float64"), "has_write_scope": pd.Series([0.0], dtype="float64"), "unique_geos": pd.Series([0.0], dtype="float64"), "unique_ips": pd.Series([0.0], dtype="float64"), "max_concurrent_sessions": pd.Series([0.0], dtype="float64"), "has_anonymizer_geo": pd.Series([0.0], dtype="float64"), "apps_accessed_last_24h_count": pd.Series([0.0], dtype="float64"), "total_auth_events_24h": pd.Series([0.0], dtype="float64"), "scope_escalation_attempts_7d": pd.Series([0.0], dtype="float64"), "new_app_connections_7d": pd.Series([0.0], dtype="float64"), "agent_age_days": pd.Series([0.0], dtype="float64"), "auth_method_service_account": pd.Series([0.0], dtype="float64"), "auth_method_oauth_client_credentials": pd.Series([0.0], dtype="float64"), "integration_signals_present": pd.Series([0.0], dtype="float64"), "crud_volume_ratio": pd.Series([0.0], dtype="float64"), "data_volume_high": pd.Series([0.0], dtype="float64")})
output_sample = np.array(["example_value"])
method_sample = StandardPythonParameterType("predict")

try:
    log_server.enable_telemetry(INSTRUMENTATION_KEY)
    log_server.set_verbosity('INFO')
    logger = logging.getLogger('azureml.automl.core.scoring_script')
except:
    pass


def init():
    global model
    # This name is model.id of model that we want to deploy deserialize the model file back
    # into a sklearn model
    model_path = os.path.join(os.getenv('AZUREML_MODEL_DIR'), 'model.pkl')
    path = os.path.normpath(model_path)
    path_split = path.split(os.sep)
    log_server.update_custom_dimensions({'model_name': path_split[-3], 'model_version': path_split[-2]})
    try:
        logger.info("Loading model from path.")
        model = joblib.load(model_path)
        logger.info("Loading successful.")
    except Exception as e:
        logging_utilities.log_traceback(e, logger)
        raise

@input_schema('method', method_sample, convert_to_provided_type=False)
@input_schema('data', PandasParameterType(input_sample))
@output_schema(NumpyParameterType(output_sample))
def run(data, method="predict"):
    try:
        if method == "predict_proba":
            result = model.predict_proba(data)
        elif method == "predict":
            result = model.predict(data)
        else:
            raise Exception(f"Invalid predict method argument received ({method})")
        if isinstance(result, pd.DataFrame):
            result = result.values
        return json.dumps({"result": result.tolist()})
    except Exception as e:
        result = str(e)
        return json.dumps({"error": result})
